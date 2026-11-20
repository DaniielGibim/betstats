import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { ingestTelegramInTransaction } from '../data/prisma-repository';
import type { TelegramUpdate } from './bot-adapter';
import type { Approval } from './config';

export const PAYLOAD_QUARANTINE_ERROR = 'data_payload_quarantined';
export const HEARTBEAT_TIMEOUT_MS = 90_000;
const LEASE_MS = 60_000;
const COLLECTOR_VERSION = 'telegram-bot-v1';
type Source = { id: string; externalChatId: string; ownerUserId: string | null; authorizationRef: string };

const nextTelegramSecond = (at: Date) => new Date(Math.floor(at.getTime() / 1000) * 1000 + 1000);

export class LeaseLost extends Error {
  constructor() { super('lease_lost'); }
}

export function matchesApproval(source: Source, approval?: Approval): approval is Approval {
  return !!approval && source.externalChatId === approval.chatId
    && source.ownerUserId === approval.ownerUserId && source.authorizationRef === approval.authorizationRef;
}

export function createPollingStore(db: PrismaClient, botUserId: string, leaseOwnerId = randomUUID()) {
  async function acquire() {
    await db.telegramPollingState.upsert({ where: { botUserId }, create: { botUserId }, update: {} });
    const now = new Date();
    const acquired = await db.telegramPollingState.updateMany({
      where: { botUserId, OR: [{ leaseOwnerId }, { leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] },
      data: { leaseOwnerId, leaseToken: { increment: 1 }, leaseExpiresAt: new Date(now.getTime() + LEASE_MS), lastHeartbeatAt: now },
    });
    if (!acquired.count) throw new LeaseLost();
    const state = await db.telegramPollingState.findUniqueOrThrow({ where: { botUserId } });
    if (state.leaseOwnerId !== leaseOwnerId) throw new LeaseLost();
    const leaseToken = state.leaseToken;
    const fence = () => ({ botUserId, leaseOwnerId, leaseToken, leaseExpiresAt: { gt: new Date() } });

    async function renew(tx: Prisma.TransactionClient = db) {
      const at = new Date();
      const changed = await tx.telegramPollingState.updateMany({
        where: fence(),
        data: { lastHeartbeatAt: at, leaseExpiresAt: new Date(at.getTime() + LEASE_MS) },
      });
      if (!changed.count) throw new LeaseLost();
    }

    async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
      return db.$transaction(async (tx) => {
        // Fence before any source, receipt or cursor writes. SQLite holds the write lock until commit.
        await renew(tx);
        return fn(tx);
      });
    }

    async function checkpoint(tx: Prisma.TransactionClient, updateId: bigint, outcome: string) {
      const cursor = await tx.telegramPollingState.updateMany({
        where: { ...fence(), OR: [{ lastConfirmedUpdateId: null }, { lastConfirmedUpdateId: { lt: updateId } }] },
        data: { lastConfirmedUpdateId: updateId },
      });
      if (!cursor.count) throw new LeaseLost();
      await tx.telegramUpdateReceipt.create({ data: { botUserId, updateId, outcome } });
    }

    async function pauseInTransaction(tx: Prisma.TransactionClient, source: Source, errorCode: string) {
      const changed = await tx.dataSource.updateMany({
        where: { id: source.id, platform: 'telegram', ownerUserId: source.ownerUserId,
          authorizationRef: source.authorizationRef, active: true, removedAt: null },
        data: { active: false },
      });
      if (!changed.count) return;
      await tx.sourceRegistration.updateMany({
        where: { resolvedSourceId: source.id, userId: source.ownerUserId ?? '', status: 'active', platform: 'telegram' },
        data: { status: 'paused_by_worker' },
      });
      const now = new Date();
      await tx.collectionRun.create({ data: { dataSourceId: source.id, botUserId, startedAt: now, finishedAt: now,
        status: 'paused', errorCode, errorCount: 1, collectorVersion: COLLECTOR_VERSION } });
    }

    return {
      renew,
      async state() {
        await renew();
        return db.telegramPollingState.findUniqueOrThrow({ where: { botUserId } });
      },
      async pollStarted() {
        await transaction(tx => tx.telegramPollingState.update({ where: { botUserId }, data: { lastPollAt: new Date() } }));
      },
      async success(coverageGap: boolean) {
        await transaction(async tx => {
          const at = new Date();
          const row = await tx.telegramPollingState.findUniqueOrThrow({ where: { botUserId } });
          await tx.telegramPollingState.update({ where: { botUserId }, data: {
            lastConfirmedUpdateId: row.lastConfirmedUpdateId ?? BigInt(0),
            lastSuccessAt: at,
            lastErrorCode: coverageGap ? 'coverage_gap' : null,
            lastErrorAt: coverageGap ? row.lastErrorAt ?? at : null,
          } });
        });
      },
      async failure(errorCode: string) {
        await transaction(tx => tx.telegramPollingState.update({ where: { botUserId },
          data: { lastErrorAt: new Date(), lastErrorCode: errorCode } }));
      },
      async release() {
        await db.telegramPollingState.updateMany({ where: fence(), data: { leaseOwnerId: null, leaseExpiresAt: null } });
      },
      async lastReceiptAt(updateId: bigint) {
        const receipt = await db.telegramUpdateReceipt.findUnique({ where: { botUserId_updateId: { botUserId, updateId } } });
        return receipt?.processedAt;
      },
      async activeSources() {
        return db.dataSource.findMany({ where: { platform: 'telegram', chatType: 'channel', active: true, removedAt: null,
          collectionRuns: { some: { botUserId, status: 'activated' } } },
          select: { id: true, ownerUserId: true, externalChatId: true, authorizationRef: true } });
      },
      async pause(source: Source, errorCode: string) {
        await transaction(tx => pauseInTransaction(tx, source, errorCode));
      },
      async awaitBotAccess(approval: Approval, username: string) {
        if (approval.botId !== botUserId) return;
        await transaction(tx => tx.sourceRegistration.updateMany({ where: {
          userId: approval.ownerUserId, normalizedUsername: username, platform: 'telegram',
          status: 'pending_resolution', resolvedSourceId: null,
        }, data: { status: 'pending_authorization' } }));
      },
      async activate(approval: Approval, channel: { username: string | null; title: string | null }) {
        if (approval.botId !== botUserId) return;
        await transaction(async tx => {
          const row = await tx.telegramPollingState.findUniqueOrThrow({ where: { botUserId } });
          if (!row.lastSuccessAt || row.lastConfirmedUpdateId === null) return;
          const existing = await tx.dataSource.findUnique({
            where: { platform_externalChatId: { platform: 'telegram', externalChatId: approval.chatId } },
            include: { registration: true },
          });
          if (existing) {
            const registration = existing.registration;
            if (existing.active || existing.removedAt || existing.chatType !== 'channel' || !existing.activatedAt
              || existing.activationUpdateId === null || !matchesApproval(existing, approval)
              || !registration || registration.platform !== 'telegram' || registration.userId !== approval.ownerUserId
              || !['paused_by_worker', 'inactive'].includes(registration.status)) return;

            const activation = await tx.collectionRun.findFirst({
              where: { dataSourceId: existing.id, botUserId, status: 'activated' },
              select: { id: true },
            });
            if (!activation) return;
            if (registration.status === 'inactive') {
              // Older worker pauses shared the manual pause status. Require both writes
              // to predate the recorded worker pause so ambiguous rows stay paused.
              const lastTransition = await tx.collectionRun.findFirst({
                where: { dataSourceId: existing.id, botUserId, status: { in: ['paused', 'reactivated'] } },
                orderBy: { startedAt: 'desc' }, select: { status: true, errorCode: true, startedAt: true },
              });
              if (lastTransition?.status !== 'paused' || !['access_lost', 'approval_revoked'].includes(lastTransition.errorCode ?? '')
                || registration.updatedAt >= lastTransition.startedAt || existing.updatedAt >= lastTransition.startedAt) return;
            }

            const resumedAt = new Date();
            await tx.dataSource.update({ where: { id: existing.id }, data: { active: true } });
            await tx.sourceRegistration.update({ where: { id: registration.id }, data: { status: 'active' } });
            await tx.collectionRun.create({ data: { dataSourceId: existing.id, botUserId,
              startedAt: resumedAt, finishedAt: resumedAt, lastUpdateId: row.lastConfirmedUpdateId,
              status: 'reactivated', collectorVersion: COLLECTOR_VERSION } });
            return;
          }

          if (!channel.username) return;
          const draft = await tx.sourceRegistration.findFirst({ where: {
            userId: approval.ownerUserId, normalizedUsername: channel.username, platform: 'telegram',
            status: { in: ['pending_resolution', 'pending_authorization'] }, resolvedSourceId: null,
          } });
          if (!draft) return;

          const authorizedAt = new Date();
          const source = await tx.dataSource.create({ data: {
            ownerUserId: approval.ownerUserId, externalChatId: approval.chatId, platform: 'telegram',
            chatType: 'channel', authorizationRef: approval.authorizationRef, authorizedAt,
            // Telegram creation timestamps have second precision. Exclude the transition second.
            activatedAt: nextTelegramSecond(authorizedAt),
            activationUpdateId: row.lastConfirmedUpdateId, active: true,
            titleSnapshot: channel.title, usernameSnapshot: channel.username,
          } });
          await tx.collectionRun.create({ data: { dataSourceId: source.id, botUserId,
            startedAt: authorizedAt, finishedAt: authorizedAt, status: 'activated', collectorVersion: COLLECTOR_VERSION } });
          await tx.sourceRegistration.update({ where: { id: draft.id }, data: { status: 'active', resolvedSourceId: source.id } });
        });
      },
      async consume(update: TelegramUpdate, options: { bootstrap: boolean; approval?: Approval; accessLost?: boolean }) {
        return transaction(async tx => {
          const row = await tx.telegramPollingState.findUniqueOrThrow({ where: { botUserId } });
          if ((row.lastConfirmedUpdateId ?? BigInt(0)) >= update.updateId) return 'duplicate';
          let outcome = options.bootstrap ? 'bootstrap_skipped' : 'ignored';
          const { post } = update;
          const { approval } = options;
          if (!options.bootstrap && post && approval?.botId === botUserId) {
            const source = await tx.dataSource.findUnique({ where: {
              platform_externalChatId: { platform: 'telegram', externalChatId: post.chatId },
            } });
            if (source?.active && !source.removedAt && source.chatType === 'channel' && matchesApproval(source, approval)) {
              if (options.accessLost) {
                await pauseInTransaction(tx, source, 'access_lost');
                outcome = 'access_lost';
              } else {
                const resumption = await tx.collectionRun.findFirst({
                  where: { dataSourceId: source.id, botUserId, status: 'reactivated' },
                  orderBy: [{ lastUpdateId: 'desc' }, { startedAt: 'desc' }],
                  select: { startedAt: true, lastUpdateId: true },
                });
                if (resumption && (resumption.lastUpdateId === null || update.updateId <= resumption.lastUpdateId
                  || new Date(post.message.sourceDate) < nextTelegramSecond(resumption.startedAt))) {
                  await checkpoint(tx, update.updateId, 'ineligible');
                  return 'ineligible';
                }
                const now = new Date();
                const run = await tx.collectionRun.create({ data: {
                  dataSourceId: source.id, botUserId, firstUpdateId: update.updateId, lastUpdateId: update.updateId,
                  startedAt: now, status: 'processing', receivedCount: 1, collectorVersion: COLLECTOR_VERSION,
                } });
                const result = await ingestTelegramInTransaction(tx, { collectionRunId: run.id,
                  message: { ...post.message, sourceId: source.id }, candidateRecords: [] },
                { botUserId, leaseOwnerId, leaseToken, chatId: post.chatId, userId: approval.ownerUserId,
                  authorizationRef: approval.authorizationRef, updateId: update.updateId, entitiesJson: post.entitiesJson });
                if (result.status === 'rejected') {
                  outcome = 'quarantined_payload';
                  await tx.collectionRun.update({ where: { id: run.id }, data: {
                    status: 'quarantined', finishedAt: new Date(), errorCount: 1,
                    errorCode: PAYLOAD_QUARANTINE_ERROR, errorDetail: result.reason,
                  } });
                } else {
                  outcome = result.status;
                  const wrote = ['created', 'revised', 'quarantined'].includes(outcome);
                  await tx.collectionRun.update({ where: { id: run.id }, data: { status: 'completed',
                    finishedAt: new Date(), newMessageCount: wrote ? 1 : 0, skippedCount: wrote ? 0 : 1 } });
                }
              }
            }
          }
          await checkpoint(tx, update.updateId, outcome);
          return outcome;
        });
      },
    };
  }

  return { acquire };
}

export type PollingLease = Awaited<ReturnType<ReturnType<typeof createPollingStore>['acquire']>>;

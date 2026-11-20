import type { PrismaClient } from '@prisma/client';
import { configuredBotId } from './config';
import { HEARTBEAT_TIMEOUT_MS, PAYLOAD_QUARANTINE_ERROR } from './polling-store';

const errorCodes = new Set([
  PAYLOAD_QUARANTINE_ERROR,
  'access_lost', 'approval_revoked', 'coverage_gap', 'poll_conflict', 'rate_limited',
  'sequence_uncertain', 'storage_failure', 'telegram_invalid_response', 'telegram_unavailable', 'unauthorized',
]);
const safeError = (code?: string | null) => code && errorCodes.has(code) ? code : null;

export async function sourceConnectionSnapshot(db: PrismaClient, userId: string, registrations: readonly {
  id: string; status: string; platform: string; resolvedSourceId: string | null;
}[], env: NodeJS.ProcessEnv = process.env) {
  const botUserId = configuredBotId(env);
  const ids = registrations.flatMap(source => source.resolvedSourceId ? [source.resolvedSourceId] : []);
  const [linked, worker, collected] = await Promise.all([
    botUserId && ids.length ? db.dataSource.findMany({
      where: { id: { in: ids }, ownerUserId: userId, platform: 'telegram', removedAt: null,
        collectionRuns: { some: { botUserId, status: 'activated' } } },
      select: { id: true, active: true, activatedAt: true,
        collectionRuns: { where: { botUserId }, orderBy: { startedAt: 'desc' }, take: 1, select: { errorCode: true } } },
    }) : [],
    botUserId ? db.telegramPollingState.findUnique({
      where: { botUserId }, select: { lastHeartbeatAt: true, lastSuccessAt: true, lastErrorCode: true, leaseExpiresAt: true },
    }) : null,
    botUserId && ids.length ? db.collectionRun.groupBy({ by: ['dataSourceId'],
      where: { dataSourceId: { in: ids }, dataSource: { ownerUserId: userId, platform: 'telegram', removedAt: null },
        botUserId, status: 'completed', newMessageCount: { gt: 0 } }, _max: { finishedAt: true } }) : [],
  ]);
  const now = Date.now();
  const activeWorker = !!worker?.lastHeartbeatAt && !!worker.leaseExpiresAt
    && worker.leaseExpiresAt.getTime() > now && now - worker.lastHeartbeatAt.getTime() < HEARTBEAT_TIMEOUT_MS;
  const collectorError = safeError(worker?.lastErrorCode);
  const collector = {
    status: !botUserId ? 'disabled' : !activeWorker ? 'stopped' : collectorError ? 'degraded' : 'running',
    lastSuccessAt: worker?.lastSuccessAt ?? null,
    lastErrorCode: collectorError,
  };

  const lastCollected = new Map(collected.map(row => [row.dataSourceId, row._max.finishedAt]));
  const byId = new Map(linked.map(row => [row.id, row]));
  const sources = registrations.map(source => {
    const row = source.resolvedSourceId ? byId.get(source.resolvedSourceId) : undefined;
    const awaitingAccess = !row && source.status === 'pending_authorization';
    const errorCode = safeError(row?.collectionRuns[0]?.errorCode)
      ?? (row?.active ? collectorError : awaitingAccess ? 'access_lost' : null);
    const status = source.platform !== 'telegram' || !botUserId ? 'disabled'
      : source.status === 'inactive' || (row && !row.active) ? 'paused'
        : awaitingAccess ? 'awaiting_bot_access'
          : !row ? source.resolvedSourceId ? 'offline' : 'awaiting_approval'
            : !activeWorker ? 'offline'
              : errorCode ? 'degraded' : 'connected';
    return { ...source, connection: {
      status, errorCode,
      activatedAt: row?.activatedAt ?? null, lastCollectedAt: row ? lastCollected.get(row.id) ?? null : null,
      lastPollSuccessAt: row?.active ? worker?.lastSuccessAt ?? null : null,
    } };
  });
  return { sources, collector };
}

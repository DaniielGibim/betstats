import { setTimeout as wait } from 'node:timers/promises';
import type { BotApi } from './bot-api';
import { BotError } from './bot-api';
import { parseUpdate } from './bot-adapter';
import type { Approval } from './config';
import { LeaseLost, matchesApproval } from './polling-store';
import type { PollingLease } from './polling-store';

const DAY_MS = 24 * 60 * 60_000;
// Telegram can reset the sequence after one week without new updates.
const SEQUENCE_GUARD_MS = 6 * DAY_MS;
const RECHECK_MS = 60_000;
const GET_ME_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 60_000;
type Store = { acquire(): Promise<PollingLease> };

function isTransientStorageError(error: unknown) {
  const code = error && typeof error === 'object'
    ? (error as { code?: string; errorCode?: string }).code ?? (error as { errorCode?: string }).errorCode
    : undefined;
  return !!code && ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2028', 'P2034'].includes(code);
}

class SequenceUncertain extends Error {
  constructor() { super('sequence_uncertain'); }
}

export function createPollCycle(api: BotApi, lease: PollingLease, approvals: ReadonlyMap<string, Approval>, botId: string) {
  let checkedAccessAt = 0;
  let checkedDraftsAt = 0;

  async function hasAccess(chatId: string, signal: AbortSignal) {
    await lease.renew();
    try {
      await api.assertAdmin(chatId, botId, signal);
      return true;
    } catch (error) {
      if (error instanceof BotError && error.code === 'access_lost') return false;
      throw error;
    }
  }

  async function reconcile(signal: AbortSignal) {
    if (Date.now() - checkedAccessAt < RECHECK_MS) return;
    for (const source of await lease.activeSources()) {
      signal.throwIfAborted();
      const approval = approvals.get(source.externalChatId);
      if (approval?.botId !== botId || !matchesApproval(source, approval)) {
        await lease.pause(source, 'approval_revoked');
      } else if (!await hasAccess(source.externalChatId, signal)) {
        await lease.pause(source, 'access_lost');
      }
    }
    checkedAccessAt = Date.now();
  }

  async function activateSources(signal: AbortSignal, queueDrainedAt: Date) {
    if (Date.now() - checkedDraftsAt < RECHECK_MS) return;
    for (const approval of approvals.values()) {
      signal.throwIfAborted();
      if (approval.botId !== botId) continue;
      await lease.renew();
      try {
        const channel = await api.getChannel(approval.chatId, signal);
        const admin = await hasAccess(approval.chatId, signal);
        signal.throwIfAborted();
        if (admin) await lease.activate(approval, channel, queueDrainedAt);
        else if (channel.username) await lease.awaitBotAccess(approval, channel.username);
      } catch (error) {
        if (!(error instanceof BotError) || error.code !== 'access_lost') throw error;
      }
    }
    checkedDraftsAt = Date.now();
  }

  return async (signal: AbortSignal) => {
    signal.throwIfAborted();
    const state = await lease.state();
    const cursor = state.lastConfirmedUpdateId;
    if (cursor !== null && cursor > BigInt(0)) {
      const lastReceipt = await lease.lastReceiptAt(cursor);
      if (!lastReceipt || Date.now() - lastReceipt.getTime() >= SEQUENCE_GUARD_MS) throw new SequenceUncertain();
    }
    const coverageGap = state.lastErrorCode === 'coverage_gap'
      || !!state.lastSuccessAt && Date.now() - state.lastSuccessAt.getTime() >= DAY_MS;
    const bootstrap = !state.lastSuccessAt;
    await reconcile(signal);
    await lease.pollStarted();
    const raw = await api.getUpdates(cursor, signal);
    signal.throwIfAborted();
    const receivedAt = new Date();
    const updates = raw.map(value => parseUpdate(value, receivedAt))
      .sort((a, b) => a.updateId < b.updateId ? -1 : a.updateId > b.updateId ? 1 : 0);

    const active = bootstrap ? [] : await lease.activeSources();
    const byChat = new Map(active.map(source => [source.externalChatId, source]));
    for (const update of updates) {
      signal.throwIfAborted();
      if (cursor !== null && update.updateId <= cursor) continue;
      const chatId = update.post?.chatId;
      const source = chatId ? byChat.get(chatId) : undefined;
      const approval = chatId ? approvals.get(chatId) : undefined;
      const approved = source && approval?.botId === botId && matchesApproval(source, approval) ? approval : undefined;
      const accessLost = !!approved && !await hasAccess(approved.chatId, signal);
      signal.throwIfAborted();
      await lease.consume(update, { bootstrap, approval: approved, accessLost });
      if (accessLost && chatId) byChat.delete(chatId);
    }

    // Before the first empty response every queued update is dropped from ingestion.
    if (!bootstrap || !updates.length) await lease.success(coverageGap);
    if (!updates.length) await activateSources(signal, receivedAt);
  };
}

async function verifyBotIdentity(api: BotApi, store: Store, expectedBotId: string, signal: AbortSignal) {
  for (let attempt = 1; ; attempt++) {
    signal.throwIfAborted();
    let botId: string;
    try {
      botId = await api.getBotId(signal);
    } catch (error) {
      signal.throwIfAborted();
      if (!(error instanceof BotError)) throw error;
      try {
        const lease = await store.acquire();
        try {
          await lease.failure(error.code);
        } finally {
          await lease.release();
        }
      } catch (diagnosticError) {
        if (!isTransientStorageError(diagnosticError)) throw diagnosticError;
      }

      const retryAfter = error.retryAfterSeconds * 1000;
      if (!['telegram_unavailable', 'rate_limited'].includes(error.code)
        || attempt === GET_ME_ATTEMPTS || retryAfter > MAX_BACKOFF_MS) throw error;
      await wait(Math.max(retryAfter, 1000 * 2 ** (attempt - 1)), undefined, { signal });
      continue;
    }
    signal.throwIfAborted();
    if (botId !== expectedBotId) throw new Error('bot_identity_mismatch');
    return botId;
  }
}

export async function runPollingWorker(
  api: BotApi, store: Store, approvals: ReadonlyMap<string, Approval>,
  expectedBotId: string, signal: AbortSignal,
) {
  let botId: string;
  try {
    botId = await verifyBotIdentity(api, store, expectedBotId, signal);
  } catch (error) {
    if (signal.aborted) return;
    throw error;
  }

  let failures = 0;
  while (!signal.aborted) {
    let lease: PollingLease | undefined;
    let delay = 0;
    try {
      lease = await store.acquire();
      const poll = createPollCycle(api, lease, approvals, botId);
      while (!signal.aborted) {
        await poll(signal);
        failures = 0;
      }
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof LeaseLost || (!lease && !isTransientStorageError(error))) throw error;
      const code = error instanceof BotError ? error.code : error instanceof SequenceUncertain ? error.message : 'storage_failure';
      if (lease) {
        try { await lease.failure(code); }
        catch (diagnosticError) { if (!isTransientStorageError(diagnosticError)) throw diagnosticError; }
      }
      if (['unauthorized', 'access_lost', 'poll_conflict', 'sequence_uncertain'].includes(code)) throw new Error(code);
      failures++;
      const retryAfter = error instanceof BotError ? error.retryAfterSeconds * 1000 : 0;
      if (retryAfter > 86_400_000) throw new Error('rate_limited');
      delay = Math.max(retryAfter, Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(failures, 6)));
    } finally {
      if (lease) {
        try { await lease.release(); }
        catch (releaseError) { if (!isTransientStorageError(releaseError)) throw releaseError; }
      }
    }
    if (delay && !signal.aborted) {
      try { await wait(delay, undefined, { signal }); } catch (error) { if (!signal.aborted) throw error; }
    }
  }
}

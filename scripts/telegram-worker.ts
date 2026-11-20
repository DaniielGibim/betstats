import { PrismaClient } from '@prisma/client';
import { createBotApi } from '../src/lib/telegram/bot-api';
import { configuredBotId, parseApprovals } from '../src/lib/telegram/config';
import { createPollingStore, LeaseLost } from '../src/lib/telegram/polling-store';
import { runPollingWorker } from '../src/lib/telegram/polling-worker';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.info('Telegram worker disabled.');
    return;
  }
  const botId = configuredBotId(process.env);
  if (!botId || !process.env.DATABASE_URL) {
    console.error('Telegram worker configuration missing.');
    process.exitCode = 1;
    return;
  }
  const approvals = parseApprovals(process.env.TELEGRAM_SOURCE_APPROVALS, botId);
  const api = createBotApi(token);
  // No Prisma query/error logging. All diagnostics emitted by this process are bounded codes.
  const db = new PrismaClient();
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    await runPollingWorker(api, createPollingStore(db, botId), approvals, botId, controller.signal);
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await db.$disconnect();
  }
}

const exitCodes = new Set(['access_lost', 'bot_identity_mismatch', 'invalid_allowlist', 'poll_conflict',
  'rate_limited', 'sequence_uncertain', 'telegram_invalid_response', 'telegram_unavailable', 'unauthorized']);
void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '';
  const code = error instanceof LeaseLost ? 'lease_lost' : exitCodes.has(message) ? message : 'worker_failure';
  console.error('Telegram worker stopped', code);
  process.exitCode = 1;
});

export interface Approval {
  botId: string;
  chatId: string;
  ownerUserId: string;
  authorizationRef: string;
}

const validId = (value: unknown, negative = false): value is string =>
  typeof value === 'string' && (negative ? /^-[1-9]\d*$/ : /^[1-9]\d*$/).test(value) && Number.isSafeInteger(Number(value));

export function configuredBotId(env: NodeJS.ProcessEnv): string | undefined {
  return validId(env.TELEGRAM_BOT_USER_ID) ? env.TELEGRAM_BOT_USER_ID : undefined;
}

export function parseApprovals(value: string | undefined, botId: string): ReadonlyMap<string, Approval> {
  let rows: unknown;
  try { rows = JSON.parse(value ?? '[]'); } catch { throw new Error('invalid_allowlist'); }
  if (!Array.isArray(rows)) throw new Error('invalid_allowlist');

  const all = new Map<string, Approval>();
  for (const row of rows) {
    const item = row as Partial<Approval> | null;
    if (!item || item.botId !== botId || !validId(item.chatId, true)
      || typeof item.ownerUserId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.ownerUserId)
      || typeof item.authorizationRef !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(item.authorizationRef)
      || all.has(item.chatId)) throw new Error('invalid_allowlist');

    all.set(item.chatId, { botId, chatId: item.chatId, ownerUserId: item.ownerUserId, authorizationRef: item.authorizationRef });
  }
  return all;
}

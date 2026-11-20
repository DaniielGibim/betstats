export type BotErrorCode = 'unauthorized' | 'access_lost' | 'poll_conflict' | 'rate_limited' | 'telegram_unavailable' | 'telegram_invalid_response';

export class BotError extends Error {
  constructor(readonly code: BotErrorCode, readonly retryAfterSeconds = 0) {
    super(code);
  }
}

export function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

export function telegramId(value: unknown, negative = false): string | undefined {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || (negative ? value >= 0 : value <= 0)) return;
  return String(value);
}

export const UPDATE_TYPES = ['channel_post', 'edited_channel_post'] as const;
export const POLL_SECONDS = 15;

export function createBotApi(token: string, fetcher: typeof fetch = fetch) {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new BotError('unauthorized');

  async function call(method: 'getMe' | 'getChat' | 'getChatMember' | 'getUpdates', body: object, signal: AbortSignal) {
    let response: Response;
    try {
      response = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', redirect: 'error', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.any([signal, AbortSignal.timeout(method === 'getUpdates' ? 22_000 : 8_000)]),
      });
    } catch {
      // Transport errors may include the request URL. Do not retain the original error.
      throw new BotError('telegram_unavailable');
    }
    const payload = asObject(await response.json().catch(() => undefined));
    if (!response.ok || payload?.ok !== true) {
      const status = response.ok ? payload?.error_code : response.status;
      if (status === 401) throw new BotError('unauthorized');
      if (status === 403 || (status === 400 && (method === 'getChat' || method === 'getChatMember'))) throw new BotError('access_lost');
      if (status === 409) throw new BotError('poll_conflict');
      if (status === 429) {
        const seconds = asObject(payload?.parameters)?.retry_after;
        throw new BotError('rate_limited', typeof seconds === 'number' && Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 15);
      }
      throw new BotError(typeof status === 'number' && status >= 500 ? 'telegram_unavailable' : 'telegram_invalid_response');
    }
    return payload.result;
  }

  return {
    async getBotId(signal: AbortSignal) {
      const me = asObject(await call('getMe', {}, signal));
      const id = telegramId(me?.id);
      if (!id || me?.is_bot !== true) throw new BotError('telegram_invalid_response');
      return id;
    },
    async getChannel(chatId: string, signal: AbortSignal) {
      const chat = asObject(await call('getChat', { chat_id: chatId }, signal));
      if (telegramId(chat?.id, true) !== chatId || chat?.type !== 'channel') throw new BotError('access_lost');
      return { username: typeof chat.username === 'string' ? chat.username.toLowerCase() : null,
        title: typeof chat.title === 'string' ? chat.title.slice(0, 256) : null };
    },
    async assertAdmin(chatId: string, botUserId: string, signal: AbortSignal) {
      const member = asObject(await call('getChatMember', { chat_id: chatId, user_id: Number(botUserId) }, signal));
      if (telegramId(asObject(member?.user)?.id) !== botUserId || !['administrator', 'creator'].includes(String(member?.status))) {
        throw new BotError('access_lost');
      }
    },
    async getUpdates(cursor: bigint | null, signal: AbortSignal) {
      const offset = cursor === null ? undefined : Number(cursor + BigInt(1));
      if (offset !== undefined && !Number.isSafeInteger(offset)) throw new BotError('telegram_invalid_response');
      const result = await call('getUpdates', { offset, limit: 100, timeout: POLL_SECONDS, allowed_updates: UPDATE_TYPES }, signal);
      if (!Array.isArray(result) || result.length > 100) throw new BotError('telegram_invalid_response');
      return result as unknown[];
    },
  };
}

export type BotApi = ReturnType<typeof createBotApi>;

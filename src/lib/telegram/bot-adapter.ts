import type { MediaReference, MessageInput } from '../data/contracts';
import { validateMessage } from '../data/validation';
import { asObject, BotError, telegramId } from './bot-api';

type ChannelPost = { chatId: string; message: Omit<MessageInput, 'sourceId'>; entitiesJson?: string };
export type TelegramUpdate = { updateId: bigint; post?: ChannelPost };

function timestamp(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value >= 253402300800) return;
  return new Date(value * 1000).toISOString();
}

const mediaTypes = ['animation', 'audio', 'document', 'photo', 'sticker', 'video', 'video_note', 'voice'] as const;
function readMedia(post: Record<string, unknown>): MediaReference[] {
  const refs: MediaReference[] = [];
  for (const type of mediaTypes) {
    if (type === 'document' && post.animation) continue; // Telegram also sets document for animations.
    const value = post[type];
    const media = asObject(Array.isArray(value) ? value.at(-1) : value);
    const id = media?.file_unique_id;
    if (typeof id === 'string' && id.trim() && id.length <= 256) refs.push({ type, reference: id });
  }
  return refs;
}

function readEntities(value: unknown, textLength: number) {
  if (!Array.isArray(value)) return;
  const entities = value.slice(0, 256).flatMap(entry => {
    const entity = asObject(entry);
    if (!entity || typeof entity.type !== 'string' || !/^[a-z_]{1,40}$/.test(entity.type)) return [];
    const { offset, length } = entity;
    if (typeof offset !== 'number' || typeof length !== 'number' || !Number.isInteger(offset)
      || !Number.isInteger(length) || offset < 0 || length <= 0 || offset + length > textLength) return [];
    const fields: Record<string, string | number> = { type: entity.type, offset, length };
    for (const key of ['url', 'language', 'custom_emoji_id']) {
      const field = entity[key];
      if (typeof field === 'string' && field.length <= 2048) fields[key] = field;
    }
    const userId = telegramId(asObject(entity.user)?.id);
    return [{ ...fields, ...(userId ? { user: { id: userId } } : {}) }];
  });
  return entities.length ? JSON.stringify(entities) : undefined;
}

export function parseUpdate(value: unknown, receivedAt: Date): TelegramUpdate {
  const row = asObject(value);
  const id = telegramId(row?.update_id);
  if (!id || Number(id) >= Number.MAX_SAFE_INTEGER) throw new BotError('telegram_invalid_response');
  const updateId = BigInt(id);
  const edited = row?.edited_channel_post !== undefined;
  if (edited && row?.channel_post !== undefined) return { updateId };
  const post = asObject(edited ? row?.edited_channel_post : row?.channel_post);
  const chat = asObject(post?.chat);
  const chatId = telegramId(chat?.id, true);
  const messageId = telegramId(post?.message_id);
  const sourceDate = timestamp(post?.date);
  const editDate = edited ? timestamp(post?.edit_date) : undefined;
  if (!post || chat?.type !== 'channel' || !chatId || !messageId || !sourceDate || (edited && !editDate)) return { updateId };

  const message: Omit<MessageInput, 'sourceId'> = {
    externalMessageId: messageId, sourceDate, editDate, receivedAt: receivedAt.toISOString(),
    text: typeof post.text === 'string' ? post.text : typeof post.caption === 'string' ? post.caption : '',
    media: readMedia(post),
  };
  if (!validateMessage({ ...message, sourceId: chatId })) return { updateId };
  const entitiesJson = readEntities(typeof post.text === 'string' ? post.entities : post.caption_entities, message.text.length);
  return { updateId, post: { chatId, message, entitiesJson } };
}

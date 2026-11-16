import type { MessageInput, Source } from './contracts';

function timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, zone, , offsetHour, offsetMinute] = match;
  const y = Number(year), m = Number(month), d = Number(day), h = Number(hour), min = Number(minute), sec = Number(second);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1] && h <= 23 && min <= 59 && sec <= 59 && (zone === 'Z' || (Number(offsetHour) <= 14 && Number(offsetMinute) <= 59 && (Number(offsetHour) !== 14 || Number(offsetMinute) === 0))) && Number.isFinite(Date.parse(value));
}
export function validateMessage(value: unknown): value is MessageInput {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  const id = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 256;
  return id(m.sourceId) && id(m.externalMessageId) && timestamp(m.sourceDate) && timestamp(m.receivedAt) && Date.parse(m.receivedAt as string) >= Date.parse(m.sourceDate as string) && (m.editDate === undefined || (timestamp(m.editDate) && Date.parse(m.editDate) >= Date.parse(m.sourceDate as string) && Date.parse(m.editDate) <= Date.parse(m.receivedAt as string))) && typeof m.text === 'string' && m.text.length <= 100000 && Array.isArray(m.media) && m.media.length <= 100 && m.media.every((item: unknown) => !!item && typeof item === 'object' && id((item as Record<string, unknown>).type) && id((item as Record<string, unknown>).reference));
}
/** Eligibility uses the original creation time, including for later edits. */
export function isEligible(source: Source, message: MessageInput): boolean {
  return source.active && source.id === message.sourceId && timestamp(source.activatedAt) && validateMessage(message) && Date.parse(message.sourceDate) >= Date.parse(source.activatedAt);
}

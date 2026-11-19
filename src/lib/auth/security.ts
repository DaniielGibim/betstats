import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function sessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw new HttpError(503, 'Authentication unavailable.');
  return value;
}
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const valid = stored && /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored);
  const [, salt, hash] = valid ? stored.split('$') : ['scrypt-v1', '0'.repeat(32), '0'.repeat(128)];
  const key = await derive(password, salt);
  return timingSafeEqual(key, Buffer.from(hash, 'hex')) && !!valid;
}
export const SESSION_SECONDS = 8 * 60 * 60;
export const cookieName = () => process.env.NODE_ENV === 'production' ? '__Host-betstats_session' : 'betstats_session';
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_SECONDS });
const sign = (value: string) => createHmac('sha256', sessionSecret()).update(value).digest('base64url');
export function credentialTag(hash: string): string { return sign(`credential:${hash}`); }
export function issueSession(userId: string, passwordHash: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, sub: userId, credential: credentialTag(passwordHash), iat, exp: iat + SESSION_SECONDS, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function readSession(token: string, now = Date.now()): { sub: string; credential: string } | null {
  sessionSecret();
  if (token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  const expected = Buffer.from(sign(parts[0]));
  if (!timingSafeEqual(expected, Buffer.from(parts[1]))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const seconds = Math.floor(now / 1000);
    if (data.v !== 1 || typeof data.sub !== 'string' || !data.sub || typeof data.credential !== 'string' || !Number.isInteger(data.iat) || !Number.isInteger(data.exp) || data.iat > seconds || data.exp <= seconds || data.exp - data.iat !== SESSION_SECONDS) return null;
    return { sub: data.sub, credential: data.credential };
  } catch { return null; }
}

export function objectInput(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new HttpError(400, 'Invalid input.');
  return value as Record<string, unknown>;
}
export function credentials(value: unknown, register = false) {
  const data = objectInput(value, register ? ['name', 'email', 'password'] : ['email', 'password']);
  if (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || typeof data.password !== 'string' || data.password.length < 12 || Buffer.byteLength(data.password) > 256) throw new HttpError(400, 'Invalid email or password (12-256 bytes).');
  if (register && (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 100)) throw new HttpError(400, 'Invalid name.');
  return { email: data.email.trim().toLowerCase(), password: data.password, name: register ? (data.name as string).trim() : '' };
}

// Best-effort process-local protection; production needs a shared rate limiter at ingress.
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit = 10, now = Date.now()): void {
  for (const [id, item] of buckets) if (item.until <= now) buckets.delete(id);
  if (!buckets.has(key) && buckets.size >= 10000) throw new HttpError(429, 'Try again later.');
  const bucket = buckets.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
  buckets.set(key, bucket);
  if (++bucket.count > limit) throw new HttpError(429, 'Try again later.');
}
let inFlight = 0;
export async function passwordWork<T>(work: () => Promise<T>): Promise<T> {
  if (inFlight >= 4) throw new HttpError(429, 'Try again later.');
  inFlight++;
  try { return await work(); } finally { inFlight--; }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { createAuthService } from './service';
import { cookieName, HttpError, sessionSecret } from './security';

export const auth = createAuthService(prisma);
export async function requireUser(request: NextRequest) {
  return auth.authenticate(request.cookies.get(cookieName())?.value ?? '');
}
export function sameOrigin(request: Request) {
  sessionSecret();
  // Next normalizes loopback URLs to localhost. Compare the actual Host header;
  // never trust client-controlled forwarded headers. Proxies must preserve Host.
  const url = new URL(request.url);
  const host = request.headers.get('host') ?? url.host;
  const expected = `${url.protocol}//${host}`;
  if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Same-origin request required.');
}
export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'JSON required.');
  if (!request.body) throw new HttpError(400, 'JSON required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  } finally { reader.releaseLock(); }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } });
}
export async function handle(work: () => Promise<NextResponse>) {
  try { return await work(); }
  catch (error) {
    const known = error instanceof HttpError;
    const response = json({ error: known ? error.message : 'Service unavailable.' }, known ? error.status : 503);
    if (known && error.status === 429) response.headers.set('Retry-After', '900');
    return response;
  }
}

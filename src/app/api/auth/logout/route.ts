import { NextRequest } from 'next/server';
import { handle, json, sameOrigin } from '@/lib/auth/http';
import { cookieName, cookieOptions } from '@/lib/auth/security';
export const runtime = 'nodejs';
// Stateless logout clears this browser's cookie; stolen tokens expire after eight hours.
export async function POST(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request);
    const response = json({ ok: true });
    response.cookies.set(cookieName(), '', { ...cookieOptions(), maxAge: 0 });
    return response;
  });
}

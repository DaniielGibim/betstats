import { NextRequest } from 'next/server';
import { auth, handle, json, readJson, sameOrigin } from '@/lib/auth/http';
import { cookieName, cookieOptions, HttpError, issueSession } from '@/lib/auth/security';
import { publicUser } from '@/lib/auth/service';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request);
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
      if (process.env.NODE_ENV === 'production') throw new HttpError(403, 'Registration disabled.');
      if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) throw new HttpError(403, 'Local registration only.');
    }
    const user = await auth.register(await readJson(request));
    const response = json({ user: publicUser(user) }, 201);
    response.cookies.set(cookieName(), issueSession(user.id, user.passwordHash!), cookieOptions());
    return response;
  });
}

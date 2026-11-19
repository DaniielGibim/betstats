import { NextRequest } from 'next/server';
import { auth, handle, json, readJson, sameOrigin } from '@/lib/auth/http';
import { cookieName, cookieOptions, issueSession } from '@/lib/auth/security';
import { publicUser } from '@/lib/auth/service';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request);
    const user = await auth.login(await readJson(request));
    const response = json({ user: publicUser(user) });
    response.cookies.set(cookieName(), issueSession(user.id, user.passwordHash!), cookieOptions());
    return response;
  });
}

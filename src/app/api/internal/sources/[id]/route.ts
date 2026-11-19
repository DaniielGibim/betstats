import { NextRequest } from 'next/server';
import { handle, json, readJson, requireUser, sameOrigin } from '@/lib/auth/http';
import { createSourceService, type SourceDatabase } from '@/lib/auth/sources';
import { HttpError, objectInput, rateLimit } from '@/lib/auth/security';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
const sources = createSourceService(prisma as unknown as SourceDatabase);
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    rateLimit(`source:${user.id}`, 60);
    const input = objectInput(await readJson(request), ['action']);
    if (input.action !== 'pause') throw new HttpError(400, 'Only pause is available; Telegram resolution and authorization are pending.');
    return json({ source: await sources.change(user.id, (await context.params).id, 'pause') });
  });
}
export async function DELETE(request: NextRequest, context: Context) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    rateLimit(`source:${user.id}`, 60);
    return json({ source: await sources.change(user.id, (await context.params).id, 'remove') });
  });
}

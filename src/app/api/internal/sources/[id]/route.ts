import { NextRequest } from 'next/server';
import { handle, json, readJson, requireUser, sameOrigin } from '@/lib/auth/http';
import { createSourceService, type SourceDatabase } from '@/lib/auth/sources';
import { HttpError, objectInput, rateLimit } from '@/lib/auth/security';
import { sourceConnectionSnapshot } from '@/lib/telegram/connection-service';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
const sources = createSourceService(prisma as unknown as SourceDatabase);
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  return handle(async () => {
    const user = await requireUser(request);
    const { id } = await context.params;
    const registration = await prisma.sourceRegistration.findFirst({ where: { id, userId: user.id, status: { not: 'removed' } } });
    if (!registration) throw new HttpError(404, 'Source not found.');
    const { sources: [source] } = await sourceConnectionSnapshot(prisma, user.id, [registration]);
    return json({ source });
  });
}
export async function PATCH(request: NextRequest, context: Context) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    rateLimit(`source:${user.id}`, 60);
    const input = objectInput(await readJson(request), ['action']);
    if (input.action !== 'pause') throw new HttpError(400, 'Only pause is available. Source activation requires operator approval.');
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

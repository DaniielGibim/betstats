import { NextRequest } from 'next/server';
import { handle, json, readJson, requireUser, sameOrigin } from '@/lib/auth/http';
import { createSourceService, type SourceDatabase } from '@/lib/auth/sources';
import { rateLimit } from '@/lib/auth/security';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
const sources = createSourceService(prisma as unknown as SourceDatabase);
export async function GET(request: NextRequest) {
  return handle(async () => json({ sources: await sources.list((await requireUser(request)).id) }));
}
export async function POST(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    rateLimit(`source:${user.id}`, 60);
    return json({ source: await sources.create(user.id, await readJson(request)) }, 201);
  });
}

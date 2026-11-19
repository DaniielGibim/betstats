import { NextRequest } from 'next/server';
import { handle, json, requireUser } from '@/lib/auth/http';
import { publicUser } from '@/lib/auth/service';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  return handle(async () => json({ user: publicUser(await requireUser(request)) }));
}

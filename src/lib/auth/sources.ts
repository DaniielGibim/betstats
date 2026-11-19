import { HttpError, objectInput } from './security';

export function normalizeUsername(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'Invalid username.');
  const normalized = value.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(normalized)) throw new HttpError(400, 'Use a Telegram username with 5-32 characters.');
  return normalized;
}
type Registration = { id: string; userId: string; platform: string; requestedUsername: string; normalizedUsername: string; status: string; resolvedSourceId: string | null; createdAt: Date; updatedAt: Date };
export const MAX_SOURCE_REGISTRATIONS = 100;
interface SourceTransaction {
  sourceRegistration: {
    count(args: object): Promise<number>;
    findMany(args: object): Promise<Registration[]>;
    findFirst(args: object): Promise<Registration | null>;
    create(args: object): Promise<Registration>;
    updateMany(args: object): Promise<{ count: number }>;
  };
  dataSource: { updateMany(args: object): Promise<{ count: number }> };
}
export interface SourceDatabase extends SourceTransaction {
  $transaction<T>(fn: (tx: SourceTransaction) => Promise<T>): Promise<T>;
}
export function createSourceService(db: SourceDatabase) {
  function owner(userId: string) { if (!userId) throw new HttpError(401, 'Authentication required.'); }
  return {
    async list(userId: string) {
      owner(userId);
      // Never hide legacy/imported registrations even if they exceed the create cap.
      return db.sourceRegistration.findMany({ where: { userId, status: { not: 'removed' } }, orderBy: { createdAt: 'desc' } });
    },
    async create(userId: string, value: unknown) {
      owner(userId);
      const input = objectInput(value, ['username']);
      const normalizedUsername = normalizeUsername(input.username);
      try {
        // SQLite transactions are serializable: counting and inserting must commit
        // together so simultaneous requests cannot both consume the final slot.
        return await db.$transaction(async tx => {
          const count = await tx.sourceRegistration.count({ where: { userId, status: { not: 'removed' } } });
          if (count >= MAX_SOURCE_REGISTRATIONS) throw new HttpError(409, 'Limit of 100 nonremoved sources reached. Remove a source before adding another.');
          return tx.sourceRegistration.create({ data: { userId, platform: 'telegram', requestedUsername: (input.username as string).trim(), normalizedUsername, status: 'pending_resolution' } });
        });
      }
      catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') throw new HttpError(409, 'Username already registered, including removed entries; restoration is not supported.');
        if (['P2034', 'P1008', 'P2028'].includes(code ?? '')) throw new HttpError(409, 'Source registration busy; retry.');
        throw error;
      }
    },
    async change(userId: string, id: string, action: 'pause' | 'remove') {
      owner(userId);
      if (!id || id.length > 128) throw new HttpError(400, 'Invalid source id.');
      return db.$transaction(async tx => {
        const row = await tx.sourceRegistration.findFirst({ where: { id, userId, status: { not: 'removed' } } });
        if (!row) throw new HttpError(404, 'Source not found.');
        const status = action === 'remove' ? 'removed' : 'inactive';
        if (row.resolvedSourceId) {
          const changed = await tx.dataSource.updateMany({ where: { id: row.resolvedSourceId, ownerUserId: userId, removedAt: null }, data: { active: false, ...(action === 'remove' ? { removedAt: new Date() } : {}) } });
          if (changed.count !== 1) throw new HttpError(409, 'Source ownership mismatch.');
        }
        const changed = await tx.sourceRegistration.updateMany({ where: { id, userId, status: row.status }, data: { status } });
        if (changed.count !== 1) throw new HttpError(409, 'Source changed; retry.');
        return { ...row, status };
      });
    },
  };
}

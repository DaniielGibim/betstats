import { randomUUID } from 'node:crypto';
import { credentialTag, credentials, hashPassword, HttpError, passwordWork, rateLimit, readSession, sessionSecret, verifyPassword } from './security';

type User = { id: string; name: string; email: string; passwordHash: string | null };
export interface AuthDatabase {
  user: {
    findUnique(args: { where: { email: string } | { id: string } }): Promise<User | null>;
    create(args: { data: { name: string; email: string; passwordHash: string; slug: string } }): Promise<User>;
  };
}
export const publicUser = (user: User) => ({ id: user.id, name: user.name, email: user.email });
export function createAuthService(db: AuthDatabase) {
  return {
    async register(value: unknown) {
      sessionSecret();
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') throw new HttpError(403, 'Registration disabled.');
      const input = credentials(value, true);
      rateLimit('auth:global', 300);
      rateLimit(`auth:${input.email}`);
      const passwordHash = await passwordWork(() => hashPassword(input.password));
      try { return await db.user.create({ data: { name: input.name, email: input.email, passwordHash, slug: randomUUID() } }); }
      catch (error) {
        if ((error as { code?: string }).code === 'P2002') throw new HttpError(409, 'Unable to register account.');
        throw error;
      }
    },
    async login(value: unknown) {
      sessionSecret();
      const input = credentials(value);
      rateLimit('auth:global', 300);
      rateLimit(`auth:${input.email}`);
      const user = await db.user.findUnique({ where: { email: input.email } });
      const ok = await passwordWork(() => verifyPassword(input.password, user?.passwordHash ?? null));
      if (!ok || !user) throw new HttpError(401, 'Invalid credentials.');
      return user;
    },
    async authenticate(token: string) {
      const session = readSession(token);
      if (!session) throw new HttpError(401, 'Authentication required.');
      const user = await db.user.findUnique({ where: { id: session.sub } });
      if (!user?.passwordHash || credentialTag(user.passwordHash) !== session.credential) throw new HttpError(401, 'Authentication required.');
      return user;
    },
  };
}

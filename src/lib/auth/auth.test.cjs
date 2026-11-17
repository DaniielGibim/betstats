/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { randomBytes } = require('node:crypto');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const security = require('./security.ts');
const { createAuthService, publicUser } = require('./service.ts');
const { createSourceService, normalizeUsername } = require('./sources.ts');
process.env.SESSION_SECRET = randomBytes(32).toString('hex');

test('scrypt, signed sessions, expiry, secret and cookie policy', async () => {
  const password = 'synthetic-password-123';
  const hash = await security.hashPassword(password);
  assert.notEqual(hash, await security.hashPassword(password));
  assert(await security.verifyPassword(password, hash));
  assert(!await security.verifyPassword('wrong-password', hash));
  assert(!await security.verifyPassword(password, null));
  assert(!await security.verifyPassword(password, 'scrypt-v1$bad'));
  const now = Date.now();
  const token = security.issueSession('synthetic-user', hash, now);
  assert.equal(security.readSession(token, now).sub, 'synthetic-user');
  assert.equal(security.readSession(token, now + security.SESSION_SECONDS * 1000), null);
  assert.equal(security.readSession(token, now - 1000), null);
  assert.equal(security.readSession(token + 'x', now), null);
  assert.equal(security.readSession('x.' + token.split('.')[1], now), null);
  const original = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  assert.throws(() => security.readSession(token), { status: 503 });
  process.env.SESSION_SECRET = 'short';
  assert.throws(() => security.issueSession('u', hash), { status: 503 });
  process.env.SESSION_SECRET = original;
  const mode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  assert.equal(security.cookieName(), '__Host-betstats_session');
  assert.deepEqual(security.cookieOptions(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 28800 });
  if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode;
});
test('validation rejects client ownership, roles, malformed input; limiter bounds attempts', () => {
  assert.throws(() => security.credentials({ email: 'a@example.test', password: 'short' }));
  assert.throws(() => security.credentials({ email: 'a@example.test', password: 'long-password', role: 'admin' }));
  assert.equal(normalizeUsername(' @Synthetic_Channel '), 'synthetic_channel');
  assert.throws(() => normalizeUsername('https://t.me/synthetic'));
  assert.throws(() => normalizeUsername('a'));
  security.rateLimit('test-limit', 1, 100);
  assert.throws(() => security.rateLimit('test-limit', 1, 100), { status: 429 });
  security.rateLimit('test-limit', 1, 900101);
});

test('isolated SQLite auth and owner-scoped source lifecycle', { skip: !process.env.AUTH_TEST_CLIENT }, async () => {
  assert(process.env.AUTH_TEST_DATABASE_URL?.endsWith('/auth-test.sqlite'), 'Use the dedicated isolated database');
  const { PrismaClient } = require(process.env.AUTH_TEST_CLIENT);
  const db = new PrismaClient({ datasources: { db: { url: process.env.AUTH_TEST_DATABASE_URL } } });
  try {
    const auth = createAuthService(db);
    const service = createSourceService(db);
    const suffix = randomBytes(8).toString('hex');
    const email = `synthetic-${suffix}@example.test`;
    const user = await auth.register({ name: 'Synthetic user', email: email.toUpperCase(), password: 'synthetic-pass-123' });
    const other = await auth.register({ name: 'Other user', email: `other-${suffix}@example.test`, password: 'synthetic-pass-456' });
    assert.equal(user.email, email);
    assert.equal(user.role, 'usuario');
    assert.equal(Object.hasOwn(publicUser(user), 'passwordHash'), false);
    assert.equal((await auth.login({ email, password: 'synthetic-pass-123' })).id, user.id);
    await assert.rejects(auth.login({ email, password: 'wrong-pass-123' }), { status: 401 });
    await assert.rejects(auth.login({ email: 'unknown@example.test', password: 'wrong-pass-123' }), { status: 401 });
    await assert.rejects(auth.register({ name: 'Duplicate', email, password: 'synthetic-pass-123' }), { status: 409 });
    const token = security.issueSession(user.id, user.passwordHash);
    assert.equal((await auth.authenticate(token)).id, user.id);
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await security.hashPassword('new-password-123') } });
    await assert.rejects(auth.authenticate(token), { status: 401 });
    await assert.rejects(service.create(user.id, { username: '@Synthetic', ownerUserId: other.id }), { status: 400 });
    const draft = await service.create(user.id, { username: '@Synthetic' });
    assert.equal(draft.status, 'pending_resolution');
    assert.equal(draft.normalizedUsername, 'synthetic');
    assert.equal(draft.resolvedSourceId, null);
    await assert.rejects(service.create(user.id, { username: 'SYNTHETIC' }), { status: 409 });
    await service.create(other.id, { username: 'synthetic' });
    assert((await service.list(other.id)).every(row => row.userId === other.id));
    await assert.rejects(service.change(other.id, draft.id, 'remove'), { status: 404 });
    const source = await db.dataSource.create({ data: { ownerUserId: user.id, platform: 'synthetic', externalChatId: suffix, chatType: 'channel', authorizationRef: 'synthetic:test', authorizedAt: new Date(), activatedAt: new Date(), active: true } });
    await assert.rejects(db.sourceRegistration.update({ where: { id: draft.id }, data: { resolvedSourceId: source.id, userId: other.id } }));
    await db.sourceRegistration.update({ where: { id: draft.id }, data: { resolvedSourceId: source.id, status: 'active' } });
    assert.equal((await service.change(user.id, draft.id, 'pause')).status, 'inactive');
    assert.equal((await db.dataSource.findUnique({ where: { id: source.id } })).active, false);
    assert.equal((await service.change(user.id, draft.id, 'remove')).status, 'removed');
    assert((await db.dataSource.findUnique({ where: { id: source.id } })).removedAt);
    assert.equal((await service.list(user.id)).length, 0);
    assert(await db.sourceRegistration.findUnique({ where: { id: draft.id } }));
    await assert.rejects(service.change(user.id, draft.id, 'pause'), { status: 404 });
    await assert.rejects(service.create(user.id, { username: 'synthetic' }), { status: 409 });
  } finally { await db.$disconnect(); }
});

test('HTTP routes enforce CSRF, production signup gate, cookies and owner authentication', { skip: !process.env.AUTH_TEST_CLIENT }, async () => {
  const Module = require('node:module');
  const path = require('node:path');
  const resolve = Module._resolveFilename;
  const root = path.resolve(__dirname, '../..');
  Module._resolveFilename = function(name, ...args) {
    if (name.startsWith('@/')) name = path.join(root, name.slice(2));
    if (name === '@prisma/client') name = process.env.AUTH_TEST_CLIENT;
    return resolve.call(this, name, ...args);
  };
  process.env.DATABASE_URL = process.env.AUTH_TEST_DATABASE_URL;
  const { NextRequest } = require('next/server');
  const register = require('../../app/api/auth/register/route.ts');
  const login = require('../../app/api/auth/login/route.ts');
  const session = require('../../app/api/auth/session/route.ts');
  const logout = require('../../app/api/auth/logout/route.ts');
  const sources = require('../../app/api/internal/sources/route.ts');
  const detail = require('../../app/api/internal/sources/[id]/route.ts');
  const { prisma } = require('../prisma.ts');
  const request = (url, method = 'GET', body, cookie, origin = 'http://127.0.0.1') => new NextRequest(`http://127.0.0.1${url}`, { method, headers: { origin, host: '127.0.0.1', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const suffix = randomBytes(8).toString('hex');
  const input = { name: 'HTTP synthetic', email: `http-${suffix}@example.test`, password: 'synthetic-password-123' };
  const mode = process.env.NODE_ENV;
  const allow = process.env.ALLOW_PUBLIC_REGISTRATION;
  try {
    assert.equal((await register.POST(request('/api/auth/register', 'POST', input, undefined, 'https://evil.example'))).status, 403);
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
    assert.equal((await register.POST(request('/api/auth/register', 'POST', input))).status, 403);
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
    const production = await register.POST(request('/api/auth/register', 'POST', { ...input, email: `prod-${suffix}@example.test` }));
    assert.equal(production.status, 201);
    assert.match(production.headers.get('set-cookie'), /__Host-betstats_session=/);
    assert.match(production.headers.get('set-cookie'), /; Secure/i);
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
    process.env.NODE_ENV = 'test';
    const response = await register.POST(request('/api/auth/register', 'POST', input));
    assert.equal(response.status, 201, await response.clone().text());
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    const tokenCookie = cookie.split(';')[0];
    assert.equal((await login.POST(request('/api/auth/login', 'POST', { email: input.email, password: input.password }))).status, 200);
    assert.equal((await session.GET(request('/api/auth/session', 'GET', undefined, tokenCookie))).status, 200);
    assert.equal((await sources.GET(request('/api/internal/sources'))).status, 401);
    assert.equal((await sources.POST(request('/api/internal/sources', 'POST', { username: 'HttpSynthetic' }, tokenCookie, 'https://evil.example'))).status, 403);
    const created = await sources.POST(request('/api/internal/sources', 'POST', { username: 'HttpSynthetic' }, tokenCookie));
    assert.equal(created.status, 201);
    const id = (await created.json()).source.id;
    assert.equal((await detail.PATCH(request('/api/internal/sources/' + id, 'PATCH', { action: 'activate' }, tokenCookie), { params: Promise.resolve({ id }) })).status, 400);
    assert.equal((await detail.PATCH(request('/api/internal/sources/' + id, 'PATCH', { action: 'pause' }, tokenCookie), { params: Promise.resolve({ id }) })).status, 200);
    assert.equal((await detail.DELETE(request('/api/internal/sources/' + id, 'DELETE', undefined, tokenCookie), { params: Promise.resolve({ id }) })).status, 200);
    const cleared = await logout.POST(request('/api/auth/logout', 'POST', undefined, tokenCookie));
    assert.equal(cleared.status, 200);
    assert.match(cleared.headers.get('set-cookie'), /Max-Age=0/i);
    const secret = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    assert.equal((await login.POST(request('/api/auth/login', 'POST', { email: input.email, password: input.password }))).status, 503);
    process.env.SESSION_SECRET = secret;
  } finally {
    await prisma.$disconnect();
    Module._resolveFilename = resolve;
    if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode;
    if (allow === undefined) delete process.env.ALLOW_PUBLIC_REGISTRATION; else process.env.ALLOW_PUBLIC_REGISTRATION = allow;
  }
});

test('source cap is per owner, atomic, frees slots only on removal, and never hides legacy rows', { skip: !process.env.AUTH_TEST_CLIENT }, async () => {
  assert(process.env.AUTH_TEST_DATABASE_URL?.endsWith('/auth-test.sqlite'));
  const { PrismaClient } = require(process.env.AUTH_TEST_CLIENT);
  const db = new PrismaClient({ datasources: { db: { url: process.env.AUTH_TEST_DATABASE_URL } } });
  const secondDb = new PrismaClient({ datasources: { db: { url: process.env.AUTH_TEST_DATABASE_URL } } });
  try {
    const suffix = randomBytes(8).toString('hex');
    const user = await db.user.create({ data: { name: 'Synthetic cap', email: `cap-${suffix}@example.test`, slug: `cap-${suffix}` } });
    const other = await db.user.create({ data: { name: 'Other cap', email: `other-cap-${suffix}@example.test`, slug: `other-cap-${suffix}` } });
    const service = createSourceService(db);
    const secondService = createSourceService(secondDb);
    await db.sourceRegistration.createMany({ data: Array.from({ length: 99 }, (_, index) => ({
      userId: user.id, platform: 'telegram', requestedUsername: `cap_source_${index}`, normalizedUsername: `cap_source_${index}`,
      status: ['active', 'pending_resolution', 'pending_authorization', 'inactive', 'error'][index % 5],
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
    })) });
    const oldest = (await service.list(user.id)).at(-1);
    assert.equal(oldest.status, 'active');
    // Independent clients simulate two requests competing for the final slot.
    const results = await Promise.allSettled([
      service.create(user.id, { username: 'cap_final_one' }),
      secondService.create(user.id, { username: 'cap_final_two' }),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const rejected = results.find(result => result.status === 'rejected');
    assert.equal(rejected.reason.status, 409);
    assert.equal(await db.sourceRegistration.count({ where: { userId: user.id, status: { not: 'removed' } } }), 100);
    await assert.rejects(service.create(user.id, { username: 'cap_over_limit' }), error => error.status === 409 && /Limit of 100/.test(error.message));
    assert((await service.list(user.id)).some(row => row.id === oldest.id));
    assert.equal((await service.list(user.id)).length, 100);
    await service.change(user.id, oldest.id, 'pause');
    await assert.rejects(service.create(user.id, { username: 'cap_after_pause' }), { status: 409 });
    await assert.rejects(service.change(other.id, oldest.id, 'remove'), { status: 404 });
    await service.create(other.id, { username: 'cap_other_owner' });
    await service.change(user.id, oldest.id, 'remove');
    assert.equal((await service.list(user.id)).length, 99);
    await service.create(user.id, { username: 'cap_replacement' });
    assert.equal((await service.list(user.id)).length, 100);
    assert(await db.sourceRegistration.findUnique({ where: { id: oldest.id } }));
    // Out-of-band/legacy overflow must still be visible, not silently sliced.
    const legacy = await db.sourceRegistration.create({ data: { userId: user.id, platform: 'synthetic', requestedUsername: 'legacy_overflow', normalizedUsername: 'legacy_overflow', status: 'active', createdAt: new Date('2025-01-01T00:00:00Z') } });
    assert.equal((await service.list(user.id)).length, 101);
    assert((await service.list(user.id)).some(row => row.id === legacy.id));
    await assert.rejects(service.create(user.id, { username: 'cap_still_full' }), { status: 409 });
    await service.change(user.id, legacy.id, 'remove');
    assert.equal((await service.list(user.id)).length, 100);
  } finally { await db.$disconnect(); await secondDb.$disconnect(); }
});

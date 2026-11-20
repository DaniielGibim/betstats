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
    const context = { params: Promise.resolve({ id }) };
    const resume = (cookie, origin) => detail.PATCH(request('/api/internal/sources/' + id, 'PATCH', { action: 'resume' }, cookie, origin), context);
    assert.equal((await resume()).status, 401);
    assert.equal((await resume(tokenCookie, 'https://evil.example')).status, 403);
    assert.equal((await resume(tokenCookie)).status, 409, 'A draft has no earlier activation to resume');
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    const linked = await prisma.dataSource.create({ data: {
      ownerUserId: owner.id, platform: 'telegram', chatType: 'channel', externalChatId: '-' + BigInt('0x' + suffix).toString(),
      authorizationRef: 'test:resume', authorizedAt: new Date(), activatedAt: new Date(), activationUpdateId: 10n, active: false,
    } });
    await prisma.sourceRegistration.update({ where: { id }, data: { resolvedSourceId: linked.id } });
    const resumed = await resume(tokenCookie);
    assert.equal(resumed.status, 202);
    assert.equal((await resumed.json()).source.status, 'resume_requested');
    assert.equal((await prisma.dataSource.findUniqueOrThrow({ where: { id: linked.id } })).active, false);
    assert.equal((await detail.DELETE(request('/api/internal/sources/' + id, 'DELETE', undefined, tokenCookie), context)).status, 200);
    assert.equal((await resume(tokenCookie)).status, 404);
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


test('legacy routes authenticate, isolate owners and reject crossed account chains', { skip: !process.env.AUTH_TEST_CLIENT }, async () => {
  const path = require('node:path');
  const Module = require('node:module');
  const isolatedUrl = process.env.AUTH_TEST_DATABASE_URL;
  assert(isolatedUrl?.endsWith('/auth-test.sqlite'), 'Use the dedicated isolated database');
  assert(!isolatedUrl.includes('..'));
  const root = path.resolve(__dirname, '../..');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function(name, ...args) {
    if (name.startsWith('@/')) name = path.join(root, name.slice(2));
    if (name === '@prisma/client') name = process.env.AUTH_TEST_CLIENT;
    return resolve.call(this, name, ...args);
  };
  const originalDatabase = process.env.DATABASE_URL;
  const originalSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = isolatedUrl;
  const { NextRequest } = require('next/server');
  const { prisma: db } = require('../prisma.ts');
  const names = ['me', 'bancas', 'apostas', 'apostas/[id]', 'transacoes', 'tips', 'dashboard/all', 'financial/widgets', 'analysis/calendar'];
  const routes = Object.fromEntries(names.map(name => [name, require('../../app/api/internal/' + name + '/route.ts')]));
  const req = (name, method = 'GET', body, cookie, origin = 'http://127.0.0.1') => new NextRequest('http://127.0.0.1/api/internal/' + name, {
    method, headers: { host: '127.0.0.1', origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const call = (name, method = 'GET', body, cookie, id = 'missing', origin) => routes[name][method](req(name, method, body, cookie, origin), { params: Promise.resolve({ id }) });
  const data = async response => { assert.equal(response.status, 200, await response.clone().text()); assert.equal(response.headers.get('cache-control'), 'no-store'); return response.json(); };
  try {
    for (const [name, route] of Object.entries(routes)) {
      for (const method of ['GET', 'POST', 'PATCH', 'DELETE'].filter(method => route[method])) {
        assert.equal((await call(name, method, method === 'GET' || method === 'DELETE' ? undefined : {})).status, 401, name + ' ' + method);
        assert.equal((await call(name, method, undefined, security.cookieName() + '=invalid')).status, 401, name + ' invalid cookie');
      }
    }
    const suffix = randomBytes(8).toString('hex');
    const passwordHash = await security.hashPassword('synthetic-owner-password');
    const user = await db.user.create({ data: { name: 'Owner A', email: 'legacy-a-' + suffix + '@example.test', slug: 'a-' + suffix, passwordHash } });
    const other = await db.user.create({ data: { name: 'Owner B', email: 'legacy-b-' + suffix + '@example.test', slug: 'b-' + suffix, passwordHash } });
    const cookieA = security.cookieName() + '=' + security.issueSession(user.id, passwordHash);
    const cookieB = security.cookieName() + '=' + security.issueSession(other.id, passwordHash);
    const bancaB = await db.banca.create({ data: { userId: other.id, nome: 'B default', padrao: true } });
    assert.equal((await data(await call('dashboard/all', 'GET', undefined, cookieA))).widgets.total_apostas, 0);
    assert.equal((await call('financial/widgets', 'GET', undefined, cookieA)).status, 404);
    assert.equal((await data(await call('bancas', 'GET', undefined, cookieA))).length, 0);
    const createdBank = await call('bancas', 'POST', { nome: 'A default', valorInicial: 100, padrao: true }, cookieA);
    assert.equal(createdBank.status, 201);
    const bancaA = await createdBank.json();
    assert.equal(bancaA.userId, user.id);
    const bancaA2 = await db.banca.create({ data: { userId: user.id, nome: 'A second', padrao: false } });
    const accountA = await db.contaBookmaker.findFirst({ where: { bancaId: bancaA.id } });
    const accountA2 = await db.contaBookmaker.create({ data: { bancaId: bancaA2.id, nomeCasa: 'A2', saldoAtual: 70 } });
    const accountB = await db.contaBookmaker.create({ data: { bancaId: bancaB.id, nomeCasa: 'B secret', saldoAtual: 90 } });
    const betInput = { bancaId: bancaA.id, contaId: accountA.id, evento: 'Synthetic A', mercado: 'Synthetic market', odd: 2, stake: 10, status: 'GREEN' };
    const ownBetResponse = await call('apostas', 'POST', betInput, cookieA);
    assert.equal(ownBetResponse.status, 201);
    const ownBet = await ownBetResponse.json();
    const betB = await db.aposta.create({ data: { bancaId: bancaB.id, contaId: accountB.id, evento: 'B secret event', mercado: 'test', stake: 10, odd: 2, status: 'RED', lucroPrejuizo: -10 } });
    await db.aposta.create({ data: { bancaId: bancaB.id, evento: 'B second', mercado: 'test' } });
    const plan = await db.plan.create({ data: { name: 'Synthetic ' + suffix } });
    await db.assinatura.create({ data: { userId: user.id, planId: plan.id } });
    await db.userTelegram.create({ data: { userId: user.id, codigoVinculo: 'synthetic-link-code' } });
    const me = await data(await call('me', 'GET', undefined, cookieA));
    assert.equal(me.id, user.id);
    assert.equal(me.assinatura.usages[0].consumed, 1);
    assert.equal(Object.hasOwn(me.userTelegram, 'codigoVinculo'), false);
    assert.equal((await data(await call('me', 'GET', undefined, cookieB))).id, other.id);
    const banks = await data(await call('bancas', 'GET', undefined, cookieA));
    assert(banks.every(bank => bank.id === bancaA.id || bank.id === bancaA2.id));
    const bets = await data(await call('apostas', 'GET', undefined, cookieA));
    assert.equal(bets.meta.total, 1);
    assert(bets.data.every(bet => bet.banca.userId === user.id));
    assert.equal((await data(await call('analysis/calendar', 'GET', undefined, cookieA))).stats.totalApostasMes, 1);
    assert.equal((await data(await call('dashboard/all', 'GET', undefined, cookieA))).widgets.total_apostas, 1);
    assert.equal((await data(await call('financial/widgets', 'GET', undefined, cookieA))).contas.every(account => account.id !== accountB.id), true);
    for (const name of ['apostas', 'analysis/calendar', 'dashboard/all', 'financial/widgets']) {
      const response = await routes[name].GET(req(name + '?banca_id=' + bancaB.id, 'GET', undefined, cookieA));
      assert.equal(response.status, 404, name + ' cross-owner bank');
    }
    const before = await db.contaBookmaker.findMany({ where: { id: { in: [accountA.id, accountA2.id, accountB.id] } }, orderBy: { id: 'asc' } });
    const bankBefore = await db.banca.findMany({ where: { id: { in: [bancaA.id, bancaA2.id, bancaB.id] } }, orderBy: { id: 'asc' } });
    const betCount = await db.aposta.count();
    const transactionCount = await db.transacao.count();
    assert.equal((await call('apostas', 'POST', { ...betInput, bancaId: bancaB.id, contaId: accountB.id }, cookieA)).status, 404);
    for (const account of [accountB, accountA2]) {
      assert.equal((await call('apostas', 'POST', { ...betInput, contaId: account.id }, cookieA)).status, 404);
      for (const tipo of ['APORTE', 'RETIRADA', 'DEPOSITO_CASA', 'SAQUE_CASA', 'AJUSTE']) {
        assert.equal((await call('transacoes', 'POST', { bancaId: bancaA.id, contaId: account.id, tipo, valor: 1 }, cookieA)).status, 404, tipo + ' invalid account chain');
      }
    }
    assert.equal((await call('transacoes', 'POST', { bancaId: bancaB.id, tipo: 'APORTE', valor: 1 }, cookieA)).status, 404);
    for (const method of ['PATCH', 'DELETE']) {
      assert.equal((await call('apostas/[id]', method, method === 'PATCH' ? { status: 'GREEN' } : undefined, cookieA, betB.id)).status, 404);
      assert.equal((await call('apostas/[id]', method, method === 'PATCH' ? { status: 'GREEN' } : undefined, cookieB, ownBet.id)).status, 404);
    }
    assert.deepEqual(await db.contaBookmaker.findMany({ where: { id: { in: [accountA.id, accountA2.id, accountB.id] } }, orderBy: { id: 'asc' } }), before);
    assert.deepEqual(await db.banca.findMany({ where: { id: { in: [bancaA.id, bancaA2.id, bancaB.id] } }, orderBy: { id: 'asc' } }), bankBefore);
    assert.equal(await db.aposta.count(), betCount);
    assert.equal(await db.transacao.count(), transactionCount);
    const corrupt = await db.aposta.create({ data: { bancaId: bancaA.id, contaId: accountB.id, evento: 'Legacy bad link', mercado: 'test' } });
    const dashboardForBookmaker = async name => data(await routes['dashboard/all'].GET(req(
      'dashboard/all?banca_id=' + bancaA.id + '&bookmaker=' + encodeURIComponent(name), 'GET', undefined, cookieA)));
    assert.equal((await dashboardForBookmaker(accountB.nomeCasa)).widgets.total_apostas, 0, 'A foreign account must not match a legacy crossed link');
    assert.equal((await dashboardForBookmaker('Unknown synthetic bookmaker')).widgets.total_apostas, 0);
    assert.equal((await dashboardForBookmaker(accountA.nomeCasa)).widgets.total_apostas, 1, 'An account of the selected bankroll must still match');
    await db.contaBookmaker.update({ where: { id: accountB.id }, data: { nomeCasa: 'Renamed foreign bookmaker' } });
    assert.equal((await dashboardForBookmaker(accountB.nomeCasa)).widgets.total_apostas, 0);
    assert.equal((await dashboardForBookmaker('Renamed foreign bookmaker')).widgets.total_apostas, 0, 'Renaming a foreign account must not reveal its crossed bet');

    for (const method of ['PATCH', 'DELETE']) assert.equal((await call('apostas/[id]', method, method === 'PATCH' ? { status: 'GREEN' } : undefined, cookieA, corrupt.id)).status, 404);
    const sanitized = (await data(await call('apostas', 'GET', undefined, cookieA))).data.find(bet => bet.id === corrupt.id);
    assert.equal(sanitized.conta, null);
    assert.equal(sanitized.contaId, null);
    for (const [name, route] of Object.entries(routes)) for (const method of ['POST', 'PATCH', 'DELETE'].filter(method => route[method])) {
      assert.equal((await call(name, method, method === 'DELETE' ? undefined : {}, cookieA, ownBet.id, 'https://evil.example')).status, 403);
      const missingOrigin = req(name, method, method === 'DELETE' ? undefined : {}, cookieA);
      missingOrigin.headers.delete('origin');
      assert.equal((await route[method](missingOrigin, { params: Promise.resolve({ id: ownBet.id }) })).status, 403);
    }
    assert.equal((await call('apostas/[id]', 'PATCH', { status: 'RED' }, cookieA, ownBet.id)).status, 200);
    assert.equal((await call('apostas/[id]', 'DELETE', undefined, cookieA, ownBet.id)).status, 200);
    assert.equal((await call('transacoes', 'POST', { bancaId: bancaA.id, contaId: accountA.id, tipo: 'AJUSTE', valor: 20 }, cookieA)).status, 201);
    const tip = await call('tips', 'POST', { titulo: 'Shared ' + suffix, evento: 'Shared synthetic', mercado: 'test', oddRecomendada: 2 }, cookieA);
    assert.equal(tip.status, 201);
    const tipId = (await tip.json()).id;
    assert((await data(await call('tips', 'GET', undefined, cookieB))).some(tip => tip.id === tipId));
    assert.equal((await call('bancas', 'POST', { nome: 'No spoof', userId: other.id }, cookieA)).status, 400);
    assert.equal((await call('apostas', 'POST', { ...betInput, ownerUserId: other.id }, cookieA)).status, 400);
    for (const name of ['bancas', 'apostas', 'transacoes', 'tips']) {
      const tooLarge = req(name, 'POST', { text: 'x'.repeat(17000) }, cookieA);
      assert.equal((await routes[name].POST(tooLarge)).status, 413);
    }
    for (const name of ['bancas', 'apostas', 'transacoes', 'tips', 'apostas/[id]']) {
      const method = name === 'apostas/[id]' ? 'PATCH' : 'POST';
      const malformed = new NextRequest('http://127.0.0.1/api/internal/' + name, { method, headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', cookie: cookieA }, body: '{' });
      assert.equal((await routes[name][method](malformed, { params: Promise.resolve({ id: corrupt.id }) })).status, 400);
      const unsupported = req(name, method, {}, cookieA);
      unsupported.headers.set('content-type', 'text/plain');
      assert.equal((await routes[name][method](unsupported, { params: Promise.resolve({ id: corrupt.id }) })).status, 415);
    }
    delete process.env.SESSION_SECRET;
    for (const [name, route] of Object.entries(routes)) for (const method of ['GET', 'POST', 'PATCH', 'DELETE'].filter(method => route[method])) {
      assert.equal((await call(name, method, undefined, cookieA)).status, 503, name + ' secret missing');
    }
  } finally {
    await db.$disconnect();
    Module._resolveFilename = resolve;
    if (originalDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalDatabase;
    process.env.SESSION_SECRET = originalSecret;
  }
});

/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { createBotApi, BotError } = require('./bot-api.ts');
const { parseUpdate } = require('./bot-adapter.ts');
const { parseApprovals } = require('./config.ts');
const { createPollingStore } = require('./polling-store.ts');
const { createPollCycle, runPollingWorker } = require('./polling-worker.ts');
const { sourceConnectionSnapshot } = require('./connection-service.ts');

test('Bot API uses the durable offset, accepts only channel updates, and sanitizes errors', async () => {
  const signal = new AbortController().signal;
  const request = async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.telegram.org');
    assert.equal(options.redirect, 'error');
    const params = JSON.parse(options.body);
    assert.deepEqual(params, { offset: 51, timeout: 15, limit: 100, allowed_updates: ['channel_post', 'edited_channel_post'] });
    return Response.json({ ok: true, result: [] });
  };
  assert.deepEqual(await createBotApi('123:synthetic', request).getUpdates(50n, signal), []);
  const throttle = createBotApi('123:synthetic', async () => Response.json({
    ok: false, description: 'private', parameters: { retry_after: 37 },
  }, { status: 429 }));
  await assert.rejects(throttle.getUpdates(null, signal), { code: 'rate_limited', retryAfterSeconds: 37 });
  const failed = createBotApi('123:synthetic', async url => { throw new Error(url); });
  await assert.rejects(failed.getBotId(signal), { message: 'telegram_unavailable' });
  const invalidAdmin = createBotApi('123:synthetic', async () => Response.json({
    ok: true, result: { status: 'administrator', user: { id: 456 } },
  }));
  await assert.rejects(invalidAdmin.assertAdmin('-123', '123', signal), { code: 'access_lost' });
  const wrongChannel = createBotApi('123:synthetic', async () => Response.json({
    ok: true, result: { id: -124, type: 'channel', username: 'synthetic_channel' },
  }));
  await assert.rejects(wrongChannel.getChannel('-123', signal), { code: 'access_lost' });
  assert.throws(() => parseApprovals('[{"botId":"456"}]', '123'), /invalid_allowlist/);

  const now = new Date();
  const date = Math.floor(now.getTime() / 1000) - 10;
  const post = { chat: { type: 'channel', id: -352 }, message_id: 77, date, edit_date: date + 1,
    caption: 'A caption', photo: [{ file_unique_id: 'small' }, { file_unique_id: 'large', file_id: 'downloadable' }] };
  const update = parseUpdate({ update_id: 51, edited_channel_post: post }, now);
  assert.equal(update.updateId, 51n);
  assert.equal(update.post.chatId, '-352');
  assert.equal(update.post.message.externalMessageId, '77');
  assert.equal(update.post.message.sourceDate, new Date(date * 1000).toISOString());
  assert.equal(update.post.message.editDate, new Date((date + 1) * 1000).toISOString());
  assert.equal(update.post.message.text, 'A caption');
  assert.deepEqual(update.post.message.media, [{ type: 'photo', reference: 'large' }]);
  assert.equal(parseUpdate({ update_id: 52, message: post }, now).post, undefined);
  assert.equal(parseUpdate({ update_id: 53, channel_post: { ...post, chat: { type: 'group', id: -352 } } }, now).post, undefined);
});

test('worker retries a storage outage even if health and lease release fail', { timeout: 6000 }, async () => {
  const controller = new AbortController();
  const events = [];
  const databaseTimeout = () => Object.assign(new Error('Synthetic database timeout'), { code: 'P1008' });
  let acquisitions = 0;
  const store = {
    async acquire() {
      if (++acquisitions === 1) return {
        async state() { throw databaseTimeout(); },
        async failure(code) { events.push(code); throw databaseTimeout(); },
        async release() { events.push('release_attempt'); throw databaseTimeout(); },
      };
      controller.abort();
      return { async release() { events.push('released'); } };
    },
  };
  await runPollingWorker({ async getBotId() { return '123'; } }, store, new Map(), '123', controller.signal);
  assert.equal(acquisitions, 2);
  assert.deepEqual(events, ['storage_failure', 'release_attempt', 'released']);
});

test('worker rejects a mismatched bot before acquiring a lease', async () => {
  let calls = 0;
  const api = { async getBotId() { calls++; return '456'; } };
  const store = { async acquire() { assert.fail('A mismatched bot must not acquire a lease'); } };
  await assert.rejects(runPollingWorker(api, store, new Map(), '123', new AbortController().signal),
    { message: 'bot_identity_mismatch' });
  assert.equal(calls, 1);
});

test('getMe retries after storing a sanitized failure and starts polling only after verification',
  { skip: !process.env.AUTH_TEST_CLIENT, timeout: 6000 }, async t => {
    const isolatedUrl = process.env.AUTH_TEST_DATABASE_URL;
    assert.match(isolatedUrl ?? '', /^file:.*\/mission6-tests-[a-f0-9]+\/auth-test\.sqlite$/);
    const { PrismaClient } = require(process.env.AUTH_TEST_CLIENT);
    const db = new PrismaClient({ datasources: { db: { url: isolatedUrl } } });
    const botId = String(require('node:crypto').randomInt(100_000, 1_000_000_000));
    const controller = new AbortController();
    let polls = 0;
    let failedAt;
    let checkedFailure = false;
    const state = () => db.telegramPollingState.findUniqueOrThrow({ where: { botUserId: botId } });
    const api = createBotApi('123:synthetic', async url => {
      if (url.endsWith('/getMe')) {
        if (failedAt === undefined) {
          failedAt = performance.now();
          throw new Error('Synthetic transport failure with request URL: ' + url);
        }
        assert(!checkedFailure);
        assert(performance.now() - failedAt >= 950, 'Startup retries must wait between requests');
        const failure = await state();
        assert.equal(failure.lastErrorCode, 'telegram_unavailable');
        assert(failure.lastErrorAt);
        assert.equal(failure.lastConfirmedUpdateId, null);
        assert.equal(failure.leaseOwnerId, null);
        checkedFailure = true;
        return Response.json({ ok: true, result: { id: Number(botId), is_bot: true } });
      }
      assert(url.endsWith('/getUpdates'));
      assert(checkedFailure);
      if (++polls === 2) controller.abort();
      return Response.json({ ok: true, result: [] });
    });
    try {
      await runPollingWorker(api, createPollingStore(db, botId), new Map(), botId, AbortSignal.any([controller.signal, t.signal]));
      assert.equal(polls, 2);
      const recovered = await state();
      assert.equal(recovered.lastErrorCode, null);
      assert.equal(recovered.lastErrorAt, null);
      assert.equal(recovered.lastConfirmedUpdateId, 0n);
      assert.equal(recovered.leaseOwnerId, null);
    } finally {
      await db.$disconnect();
    }
  });

test('SQLite polling fences the worker and atomically checkpoints authorized future revisions', { skip: !process.env.AUTH_TEST_CLIENT }, async () => {
  const isolatedUrl = process.env.AUTH_TEST_DATABASE_URL;
  assert.match(isolatedUrl ?? '', /^file:.*\/mission6-tests-[a-f0-9]+\/auth-test\.sqlite$/);
  const { PrismaClient } = require(process.env.AUTH_TEST_CLIENT);
  const db = new PrismaClient({ datasources: { db: { url: isolatedUrl } } });
  const { randomInt, randomUUID } = require('node:crypto');
  const botId = String(randomInt(100_000, 1_000_000_000));
  const chatId = String(-Number(botId));
  const uid = randomUUID();
  const draftName = 'synthetic_channel';
  const signal = new AbortController().signal;
  try {
    const [owner, other] = await Promise.all(['owner', 'other'].map(name => db.user.create({ data: {
      name, email: name + uid + '@example.test', slug: name + uid,
    } })));
    const [registration] = await Promise.all([owner, other].map(user => db.sourceRegistration.create({ data: {
      userId: user.id, requestedUsername: draftName, normalizedUsername: draftName,
    } })));
    const approval = { botId, chatId, ownerUserId: owner.id, authorizationRef: 'test:approval' };
    const approvals = parseApprovals(JSON.stringify([approval]), botId);
    let simulateBusyCheckpoint = false;
    const workerDb = db.$extends({ query: { telegramUpdateReceipt: {
      async create({ args, query }) {
        if (simulateBusyCheckpoint && args.data.updateId === 16n) {
          simulateBusyCheckpoint = false;
          throw Object.assign(new Error('Synthetic database timeout'), { code: 'P1008' });
        }
        return query(args);
      },
    } } });
    const store = createPollingStore(workerDb, botId);
    const lease = await store.acquire();
    await assert.rejects(createPollingStore(db, botId).acquire(), /lease_lost/);
    let allowed = false;
    let canonicalChannel = true;
    let updates = [];
    const offsets = [];
    const api = {
      async getChannel(id) {
        assert.equal(id, chatId);
        if (!canonicalChannel) throw new BotError('access_lost');
        return { username: draftName, title: 'Synthetic' };
      },
      async assertAdmin(id, who) {
        assert.equal(id, chatId);
        assert.equal(who, botId);
        if (!allowed) throw new BotError('access_lost');
      },
      async getUpdates(cursor) { offsets.push(cursor); return updates; },
    };
    const post = (updateId, messageId, date, extras = {}, edited = false) => ({ update_id: updateId,
      [edited ? 'edited_channel_post' : 'channel_post']: { chat: { id: Number(chatId), type: 'channel' },
        message_id: messageId, date, caption: 'synthetic', ...extras } });
    let poll = createPollCycle(api, lease, approvals, botId);
    const past = Math.floor(Date.now() / 1000) - 20;
    updates = [post(10, 9, past)];
    await poll(signal);
    assert.equal((await db.sourceRegistration.findUniqueOrThrow({ where: { id: registration.id } })).status, 'pending_resolution');
    assert.equal((await db.telegramUpdateReceipt.findUniqueOrThrow({ where: { botUserId_updateId: { botUserId: botId, updateId: 10n } } })).outcome, 'bootstrap_skipped');
    updates = [];
    await poll(signal);
    assert.deepEqual(offsets, [null, 10n]);
    const pending = await db.sourceRegistration.findUniqueOrThrow({ where: { id: registration.id } });
    const pendingSnapshot = await sourceConnectionSnapshot(db, owner.id, [pending], { TELEGRAM_BOT_USER_ID: botId });
    assert.equal(pendingSnapshot.sources[0].connection.status, 'awaiting_bot_access');
    assert.equal(pendingSnapshot.collector.status, 'running');
    allowed = true;
    poll = createPollCycle(api, lease, approvals, botId);
    await poll(signal);
    const linked = await db.sourceRegistration.findUniqueOrThrow({ where: { id: registration.id }, include: { resolvedSource: true } });
    const source = linked.resolvedSource;
    assert.equal(linked.status, 'active');
    assert.equal(source.activationUpdateId, 10n);
    assert(source.activatedAt.getTime() > source.authorizedAt.getTime());
    assert.equal(await db.sourceRegistration.count({ where: { userId: other.id, status: 'pending_resolution' } }), 1);

    // Move fixture clocks back so accepted Telegram seconds are in the past.
    await db.dataSource.update({ where: { id: source.id }, data: { authorizedAt: new Date((past + 1) * 1000), activatedAt: new Date((past + 2) * 1000) } });
    const fresh = past + 2;
    updates = [
      post(10, 22, fresh),
      post(11, 9, past, { edit_date: fresh }, true),
      post(12, 10, fresh, { caption_entities: [{ type: 'bold', offset: 0, length: 9 }], photo: [{ file_unique_id: 'opaque', file_id: 'ignored' }] }),
      post(13, 10, fresh, { edit_date: fresh + 1, caption: 'changed' }, true),
      post(14, 10, fresh, { edit_date: fresh + 1, caption: 'changed' }, true),
    ];
    await poll(signal);
    await poll(signal);
    const messages = await db.sourceMessage.findMany({ where: { dataSourceId: source.id }, orderBy: { revision: 'asc' },
      include: { media: true, validations: true, classifications: true } });
    assert.deepEqual(messages.map(row => [row.externalMessageId, row.revision, row.rawText]), [['10', 1, 'synthetic'], ['10', 2, 'changed']]);
    assert.deepEqual(JSON.parse(messages[0].entitiesJson), [{ type: 'bold', offset: 0, length: 9 }]);
    assert.equal(messages[0].media[0].fileUniqueId, 'opaque');
    assert.equal(messages[0].classifications.length, 0);
    assert.equal(messages[0].validations[0].ruleCode, 'SEM_REGISTROS');
    assert.equal(await db.telegramUpdateReceipt.count({ where: { botUserId: botId } }), 5);

    // Keep the original batch across attempts: update 15 is permanently invalid,
    // while update 16 has a one-off storage failure after writing the message.
    updates = [
      post(15, 10, fresh + 2, { edit_date: fresh + 3, caption: 'Rejected payload' }, true),
      post(16, 11, fresh + 3),
    ];
    simulateBusyCheckpoint = true;
    await assert.rejects(poll(signal), { code: 'P1008' });
    const rejected = await db.telegramUpdateReceipt.findUniqueOrThrow({
      where: { botUserId_updateId: { botUserId: botId, updateId: 15n } },
    });
    assert.equal(rejected.outcome, 'quarantined_payload');
    const quarantined = await db.collectionRun.findFirstOrThrow({ where: { dataSourceId: source.id, firstUpdateId: 15n } });
    assert.equal(quarantined.status, 'quarantined');
    assert.equal(quarantined.errorCode, 'data_payload_quarantined');
    assert.equal(quarantined.errorDetail, 'source_date_conflict');
    assert.equal(quarantined.errorCount, 1);
    assert.equal(await db.sourceMessage.count({ where: { dataSourceId: source.id } }), 2);
    assert.equal(await db.telegramUpdateReceipt.count({ where: { botUserId: botId, updateId: 16n } }), 0);
    assert.equal(await db.collectionRun.count({ where: { dataSourceId: source.id, firstUpdateId: 16n } }), 0);
    assert.equal((await lease.state()).lastConfirmedUpdateId, 15n);
    const degraded = await sourceConnectionSnapshot(db, owner.id, [linked], { TELEGRAM_BOT_USER_ID: botId });
    assert.equal(degraded.sources[0].connection.status, 'degraded');
    assert.equal(degraded.sources[0].connection.errorCode, 'data_payload_quarantined');

    await poll(signal);
    assert.equal(offsets.at(-1), 15n);
    assert.equal((await lease.state()).lastConfirmedUpdateId, 16n);
    assert.equal(await db.sourceMessage.count({ where: { dataSourceId: source.id, externalMessageId: '11' } }), 1);
    assert.equal(await db.collectionRun.count({ where: { dataSourceId: source.id, firstUpdateId: 15n } }), 1);
    const recovered = await sourceConnectionSnapshot(db, owner.id, [linked], { TELEGRAM_BOT_USER_ID: botId });
    assert.equal(recovered.sources[0].connection.errorCode, null);

    updates = [post(17, 12, fresh + 4)];
    allowed = false;
    await poll(signal);

    const paused = await db.sourceRegistration.findUniqueOrThrow({ where: { id: registration.id } });
    assert.equal(paused.status, 'paused_by_worker');
    assert.equal(await db.sourceMessage.count({ where: { dataSourceId: source.id } }), 3);
    const env = { TELEGRAM_BOT_USER_ID: botId };
    const { sources: [status] } = await sourceConnectionSnapshot(db, owner.id, [paused], env);
    assert.equal(status.connection.status, 'paused');
    assert.equal(status.connection.errorCode, 'access_lost');
    assert(status.connection.lastCollectedAt);
    const { sources: [foreign] } = await sourceConnectionSnapshot(db, other.id, [paused], env);
    assert.equal(foreign.connection.errorCode, null);
    assert.equal(foreign.connection.lastCollectedAt, null);

    const Module = require('node:module');
    const path = require('node:path');
    const resolve = Module._resolveFilename;
    const saved = Object.fromEntries(['SESSION_SECRET', 'DATABASE_URL', 'TELEGRAM_BOT_USER_ID'].map(key => [key, process.env[key]]));
    let routeDb;
    try {
      process.env.SESSION_SECRET = require('node:crypto').randomBytes(32).toString('hex');
      process.env.DATABASE_URL = isolatedUrl;
      process.env.TELEGRAM_BOT_USER_ID = botId;
      Module._resolveFilename = function(name, ...args) {
        if (name.startsWith('@/')) name = path.resolve(__dirname, '../..', name.slice(2));
        if (name === '@prisma/client') name = process.env.AUTH_TEST_CLIENT;
        return resolve.call(this, name, ...args);
      };
      routeDb = require('../prisma.ts').prisma;
      const { NextRequest } = require('next/server');
      const { hashPassword, issueSession, cookieName } = require('../auth/security.ts');
      const detail = require('../../app/api/internal/sources/[id]/route.ts');
      const list = require('../../app/api/internal/sources/route.ts');
      const hash = await hashPassword('synthetic-route-password');
      await db.user.updateMany({ where: { id: { in: [owner.id, other.id] } }, data: { passwordHash: hash } });
      const request = (route, user) => new NextRequest('http://localhost/api/internal/sources' + route, {
        headers: user ? { cookie: cookieName() + '=' + issueSession(user.id, hash) } : {},
      });
      const context = { params: Promise.resolve({ id: paused.id }) };
      assert.equal((await detail.GET(request('/' + paused.id), context)).status, 401);
      assert.equal((await detail.GET(request('/' + paused.id, other), context)).status, 404);
      const response = await detail.GET(request('/' + paused.id, owner), context);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const { source: exposed } = await response.json();
      assert.equal(exposed.connection.errorCode, 'access_lost');
      assert.equal(Object.hasOwn(exposed, 'authorizationRef'), false);
      assert.equal(Object.hasOwn(exposed.connection, 'activationUpdateId'), false);
      const listed = await list.GET(request('', other));
      assert.equal(listed.status, 200);
      const { sources, collector } = await listed.json();
      assert.equal(collector.status, 'running');
      assert.equal(typeof collector.lastSuccessAt, 'string');
      assert.deepEqual(Object.keys(collector).sort(), ['lastErrorCode', 'lastSuccessAt', 'status']);
      assert.equal(sources.length, 1);
      assert.equal(sources[0].connection.status, 'awaiting_approval');
      assert.equal(sources[0].connection.lastCollectedAt, null);
    } finally {
      Module._resolveFilename = resolve;
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      await routeDb?.$disconnect();
    }


    const readSource = () => db.dataSource.findUniqueOrThrow({ where: { id: source.id } });
    const beforeResume = await readSource();
    const assertPaused = async () => assert.equal((await readSource()).active, false);
    const resume = permissions => createPollCycle(api, lease, permissions, botId)(signal);
    const receipt = id => db.telegramUpdateReceipt.findUniqueOrThrow({
      where: { botUserId_updateId: { botUserId: botId, updateId: id } },
    });
    updates = [];
    await resume(approvals);
    await assertPaused();
    allowed = true;
    for (const invalid of [
      { ...approval, ownerUserId: other.id },
      { ...approval, authorizationRef: 'test:different' },
      { ...approval, botId: '1' },
    ]) {
      await resume(new Map([[chatId, invalid]]));
      await assertPaused();
    }
    canonicalChannel = false;
    await resume(approvals);
    await assertPaused();
    canonicalChannel = true;
    updates = [post(18, 13, fresh + 5)];
    await resume(approvals);
    await assertPaused();
    assert.equal((await receipt(18n)).outcome, 'ignored');
    const receiptsBeforeResume = await db.telegramUpdateReceipt.findMany({ where: { botUserId: botId }, orderBy: { updateId: 'asc' } });
    updates = [];
    await resume(approvals);
    const restored = await readSource();
    assert.equal(restored.active, true);
    for (const field of ['id', 'ownerUserId', 'externalChatId', 'authorizationRef', 'authorizedAt', 'activatedAt', 'activationUpdateId']) {
      assert.deepEqual(restored[field], beforeResume[field], field);
    }
    assert.equal((await db.sourceRegistration.findUniqueOrThrow({ where: { id: registration.id } })).status, 'active');
    assert.equal((await lease.state()).lastConfirmedUpdateId, 18n);
    assert.deepEqual(await db.telegramUpdateReceipt.findMany({ where: { botUserId: botId }, orderBy: { updateId: 'asc' } }), receiptsBeforeResume);
    const reactivated = await db.collectionRun.findFirstOrThrow({ where: { dataSourceId: source.id, status: 'reactivated' } });
    assert.equal(reactivated.lastUpdateId, 18n);
    const transitionSecond = Math.floor(reactivated.startedAt.getTime() / 1000);
    await require('node:timers/promises').setTimeout(Math.max(0, (transitionSecond + 1) * 1000 - Date.now()) + 5);
    updates = [
      post(19, 13, fresh + 5, { edit_date: transitionSecond + 1 }, true),
      post(20, 14, transitionSecond),
      post(21, 15, transitionSecond + 1),
    ];
    await poll(signal);
    assert.equal((await receipt(19n)).outcome, 'ineligible');
    assert.equal((await receipt(20n)).outcome, 'ineligible');
    assert.equal((await receipt(21n)).outcome, 'created');
    assert.equal(await db.sourceMessage.count({ where: { dataSourceId: source.id } }), 4);

    updates = [post(22, 16, transitionSecond + 1)];
    await resume(new Map());
    await assertPaused();
    assert.equal((await receipt(22n)).outcome, 'ignored');
    const revoked = await db.collectionRun.findFirstOrThrow({
      where: { dataSourceId: source.id, status: 'paused', errorCode: 'approval_revoked' },
    });
    // Recreate the former worker pause representation, with both writes before its audit record.
    const legacyPause = new Date(revoked.startedAt.getTime() - 1);
    await db.sourceRegistration.update({ where: { id: registration.id }, data: { status: 'inactive', updatedAt: legacyPause } });
    await db.dataSource.update({ where: { id: source.id }, data: { updatedAt: legacyPause } });
    updates = [];
    await resume(approvals);
    assert.equal((await readSource()).active, true);

    const { createSourceService } = require('../auth/sources.ts');
    const sourceService = createSourceService(db);
    await sourceService.change(owner.id, registration.id, 'pause');
    await resume(approvals);
    await assertPaused();
    await sourceService.change(owner.id, registration.id, 'remove');
    await resume(approvals);
    await assertPaused();
    assert((await readSource()).removedAt);
    assert.equal(await db.collectionRun.count({ where: { dataSourceId: source.id, status: 'reactivated' } }), 2);

    await db.telegramUpdateReceipt.update({ where: { botUserId_updateId: { botUserId: botId, updateId: 22n } },
      data: { processedAt: new Date(Date.now() - 7 * 86_400_000) } });
    const priorCalls = offsets.length;
    await assert.rejects(poll(signal), /sequence_uncertain/);
    assert.equal(offsets.length, priorCalls, 'An obsolete offset must not be sent to Telegram');
    await lease.release();
    await assert.rejects(lease.consume({ updateId: 23n }, { bootstrap: false }), /lease_lost/);
    const corrected = await store.acquire();
    await corrected.release();
  } finally {
    await db.$disconnect();
  }
});

/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { createSyntheticAdapter } = require('./synthetic-adapter.ts');
test('adapter forwards explicit evidence and never segments a message', async () => {
  const calls = [];
  const adapter = createSyntheticAdapter({ ingest: async input => { calls.push(input); return { status: 'created' }; } });
  const event = { platform: 'synthetic', sourceId: 'test', externalMessageId: '1', sourceDate: '2026-11-17T00:00:00Z', receivedAt: '2026-11-17T00:00:00Z', text: 'green red', media: [] };
  await adapter.consume(event, 'run');
  assert.deepEqual(calls[0].candidateRecords, []);
  const records = [{ recordKey: 'a', evidenceText: 'green' }];
  await adapter.consume({ ...event, candidateRecords: records }, 'run');
  assert.deepEqual(calls[1].candidateRecords, records);
  await assert.rejects(adapter.consume({ ...event, platform: 'telegram' }, 'run'));
  assert.equal(calls.length, 2);
});

test('synthetic events without records persist as DATA review, not classification', { skip: !process.env.AUTH_TEST_CLIENT }, async () => {
  assert(process.env.AUTH_TEST_DATABASE_URL?.endsWith('/auth-test.sqlite'));
  const { PrismaClient } = require(process.env.AUTH_TEST_CLIENT);
  const { createDataRepository } = require('../data/prisma-repository.ts');
  const db = new PrismaClient({ datasources: { db: { url: process.env.AUTH_TEST_DATABASE_URL } } });
  try {
    const activatedAt = new Date('2026-11-17T00:00:00Z');
    const source = await db.dataSource.create({ data: { platform: 'synthetic', externalChatId: require('node:crypto').randomUUID(), chatType: 'synthetic', authorizationRef: 'synthetic:adapter-test', authorizedAt: activatedAt, activatedAt, active: true } });
    const run = await db.collectionRun.create({ data: { dataSourceId: source.id, startedAt: activatedAt, status: 'running', collectorVersion: 'synthetic-adapter-test' } });
    const repository = createDataRepository(db);
    const adapter = createSyntheticAdapter(repository);
    const event = { platform: 'synthetic', sourceId: source.id, externalMessageId: '1', sourceDate: activatedAt.toISOString(), receivedAt: activatedAt.toISOString(), text: 'green', media: [] };
    assert.equal((await adapter.consume(event, run.id)).status, 'created');
    assert.equal((await adapter.consume(event, run.id)).status, 'duplicate');
    const message = await repository.findCurrent(source.id, '1');
    assert.equal(message.classifications.length, 0);
    assert.equal(message.validations[0].ruleCode, 'SEM_REGISTROS');
    assert.equal((await adapter.consume({ ...event, externalMessageId: '2', candidateRecords: [{ recordKey: 'a', evidenceText: 'green' }] }, run.id)).status, 'created');
    assert.equal((await repository.findCurrent(source.id, '2')).classifications[0].category, 'GREEN');
    assert.equal((await adapter.consume({ ...event, externalMessageId: '3', sourceDate: '2026-11-16T23:59:59Z' }, run.id)).status, 'ineligible');
  } finally { await db.$disconnect(); }
});

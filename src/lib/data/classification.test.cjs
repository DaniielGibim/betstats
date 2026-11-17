/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { classifyRecords } = require('./classification.ts');
const { isEligible } = require('./validation.ts');
const one = (text) => classifyRecords([{ recordKey: 'synthetic', evidenceText: text }])[0];
for (const text of ['n\u00e3o green', 'n\u00e3o foi green', 'nem red', 'sem reembolso', 'nunca green']) assert.equal(one(text).category, 'INDETERMINADO');
for (const [text, category] of [['green', 'GREEN'], ['red', 'RED'], ['push', 'REEMBOLSO'], ['jogo adiado', 'ANULADO'], ['em aberto', 'PENDENTE']]) assert.equal(one(text).category, category);
for (const text of ['amanh\u00e3 ser\u00e1 green', 'ser\u00e1 green', 'previs\u00e3o green', 'ir\u00e1 green', 'amanha sera green', 'previsao green', 'ira green']) { const result = one(text); assert.equal(result.category, 'INDETERMINADO'); assert.equal(result.evidence, text); assert.equal(result.review, true); }
assert.equal(one('green red').category, 'INDETERMINADO');
assert.equal(one('jogo adiado green').category, 'INDETERMINADO');
assert.equal(one('\u2705').category, 'INDETERMINADO');
assert.deepEqual(classifyRecords([]).map(({ recordKey, category, review }) => ({ recordKey, category, review })), [{ recordKey: null, category: 'INDETERMINADO', review: true }]);
assert.deepEqual(classifyRecords([{ recordKey: 'a', evidenceText: 'green' }, { recordKey: 'b', evidenceText: 'red' }]).map(({ recordKey, category }) => [recordKey, category]), [['a', 'GREEN'], ['b', 'RED']]);
assert.throws(() => classifyRecords([{ recordKey: 'a', evidenceText: 'green' }, { recordKey: 'a', evidenceText: 'red' }]));
const source = { id: 'synthetic', active: true, activatedAt: '2026-01-01T00:00:00Z' };
const message = { sourceId: 'synthetic', externalMessageId: '1', sourceDate: source.activatedAt, receivedAt: '2026-01-02T00:00:00Z', text: '', media: [] };
assert(isEligible(source, message));
const { validateMessage } = require('./validation.ts');
assert(!validateMessage({ ...message, sourceDate: '2026-02-30T00:00:00Z', receivedAt: '2026-03-02T00:00:00Z' }));
assert(!validateMessage({ ...message, sourceDate: '2026-01-01T00:00:00+14:01' }));
assert(!validateMessage({ ...message, sourceDate: '2026-01-01T00:00:00+12:60' }));
assert(validateMessage({ ...message, sourceDate: '2024-02-29T00:00:00Z' }));
assert(!isEligible(source, { ...message, sourceDate: '2025-12-31T23:59:59Z', editDate: '2026-01-01T01:00:00Z' }));
console.log('Synthetic record, negation and activation tests passed');

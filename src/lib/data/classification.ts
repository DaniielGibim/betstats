import type { Category, Classification, ClassificationRecord } from './contracts';

const signals: Array<[Category, RegExp]> = [
  ['GREEN', /\b(green+|gren|grem|ganhamos|acertamos)\b/i],
  ['RED', /\b(red+|loss|perdemos|perdeu|deu ruim)\b/i],
  ['REEMBOLSO', /\b(reembolso|reembolsad[oa]|devolu[cç][aã]o|devolvid[oa]|estorno|estornad[oa]|push|void)\b/i],
  ['ANULADO', /\b(cancelad[oa]|adiad[oa]|evento n[aã]o realizado|jogo n[aã]o aconteceu|walkover)\b/i],
  ['PENDENTE', /\b(pendente|em aberto|aguardando|ao vivo|em andamento)\b/i],
];
function classifyRecord(record: ClassificationRecord): Classification {
  const { recordKey, evidenceText: text } = record;
  const flags: string[] = [];
  const normalized = text.normalize('NFD').replace(/\p{M}/gu, '');
  const uncertain = (reason: string): Classification => ({ recordKey, category: 'INDETERMINADO', evidence: text.trim() || null, confidence: 'nenhuma', justification: reason, origin: null, flags, review: true });
  if (/(?<![\p{L}])(amanha|sera|serao|futuro|vai|ira|seria|pode ser|espero|esperamos|previsao)(?![\p{L}])/iu.test(normalized)) return uncertain('Intenção ou previsão futura não é liquidação.');
  if (/cash\s*out|cashback/i.test(normalized)) { flags.push('cashout'); return uncertain('Encerramento antecipado ou promoção requer revisão.'); }
  // A negation anywhere makes the evidence ambiguous rather than flipping its meaning.
  if (/(?:^|[^\p{L}])(?:n[aã]o|nunca|nem|sem)(?=$|[^\p{L}])/iu.test(normalized) || /\b(quase|vai dar|se\s|green que nada|parcial|primeiro tempo|ht|meia|terceiro|outro canal|suspens[oa]|abandonad[oa]|retomad[oa])\b/i.test(normalized) || /😂|😭/.test(normalized)) return uncertain('Negação ou contexto ambíguo requer revisão.');
  const matches = signals.flatMap(([category, pattern]) => { const match = pattern.exec(normalized); return match ? [{ category, evidence: text }] : []; });
  if (matches.length !== 1) { if (matches.length > 1) flags.push('conflito'); return uncertain(matches.length ? 'Sinais conflitantes requerem revisão.' : 'Sem evidência textual suficiente.'); }
  const match = matches[0];
  return { recordKey, category: match.category, evidence: match.evidence, confidence: 'media', justification: 'Marcador textual declarado; resultado não verificado independentemente.', origin: 'declarado', flags, review: false };
}
/** No record boundaries: preserve message for ingestion and return an unassigned review finding. */
export function classifyRecords(records: readonly ClassificationRecord[]): Classification[] {
  if (!records.length) return [{ recordKey: null, category: 'INDETERMINADO', evidence: null, confidence: 'nenhuma', justification: 'Mensagem sem registros delimitados.', origin: null, flags: ['sem_registros'], review: true }];
  const seen = new Set<string>();
  for (const record of records) {
    if (typeof record.recordKey !== 'string' || !record.recordKey.trim() || typeof record.evidenceText !== 'string' || seen.has(record.recordKey)) throw new TypeError('Registro inválido ou chave duplicada.');
    seen.add(record.recordKey);
  }
  return records.map(classifyRecord);
}

import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { IngestInput, IngestResult, MessageRepository } from './contracts';
import { classifyRecords } from './classification';
import { validateMessage } from './validation';

type SourceRow = { id: string; platform: string; active: boolean; activatedAt: Date | null; authorizedAt: Date; authorizationRef: string };
type RunRow = { id: string; dataSourceId: string; collectorVersion: string };
type MessageRow = { id: string; revision: number; sourceDate: Date; editDate: Date | null; payloadHash: string; payloadRawJson: string | null; editState: string };
type Tx = {
  dataSource: { findUnique(args: object): Promise<SourceRow | null> };
  collectionRun: { findUnique(args: object): Promise<RunRow | null> };
  sourceMessage: { findMany(args: object): Promise<MessageRow[]>; create(args: object): Promise<MessageRow> };
  messageMedia: { createMany(args: object): Promise<unknown> };
  resultClassification: { createMany(args: object): Promise<unknown> };
  validationRecord: { create(args: object): Promise<unknown> };
};
type Database = { $transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>; sourceMessage: { findMany(args: object): Promise<unknown[]> } };

/** Synthetic-only adapter. The caller owns and disconnects the injected client. */
export function createDataRepository(client: PrismaClient): MessageRepository {
  const db = client as unknown as Database;
  return {
    async ingest(input: IngestInput): Promise<IngestResult> {
      const { message, candidateRecords, collectionRunId } = input;
      if (!validateMessage(message) || typeof collectionRunId !== 'string' || !collectionRunId.trim() || !Array.isArray(candidateRecords)) throw new TypeError('Entrada inválida.');
      const classifications = classifyRecords(candidateRecords);
      // Record evidence must be literal, supplied by the same message; no NLP segmentation.
      if (candidateRecords.some(record => !record.evidenceText.trim() || !message.text.includes(record.evidenceText))) throw new TypeError('Evidência não pertence à mensagem.');
      const normalizedText = message.text.normalize('NFC').trim();
      // Retry envelope is immutable: exact text, ordered media and candidate records.
      const envelope = JSON.stringify({ text: message.text, media: message.media.map(m => [m.type, m.reference]), candidateRecords: candidateRecords.map(r => [r.recordKey, r.evidenceText]) });
      const payloadHash = createHash('sha256').update(JSON.stringify({ text: normalizedText, media: message.media.map(m => [m.type, m.reference]) })).digest('hex');
      for (let attempt = 0; ; attempt++) {
        try {
          return await db.$transaction(async tx => {
            const source = await tx.dataSource.findUnique({ where: { id: message.sourceId } });
            if (!source || source.platform !== 'synthetic' || !source.authorizationRef.startsWith('synthetic:') || !source.active || !source.activatedAt || source.activatedAt < source.authorizedAt || new Date(message.sourceDate) < source.activatedAt) return { status: 'ineligible' };
            const run = await tx.collectionRun.findUnique({ where: { id: collectionRunId } });
            if (!run || run.dataSourceId !== source.id) throw new TypeError('Execução não pertence à origem.');
            const previous = await tx.sourceMessage.findMany({ where: { dataSourceId: source.id, externalMessageId: message.externalMessageId }, orderBy: { revision: 'desc' } });
            if (previous.length && previous[0].sourceDate.getTime() !== Date.parse(message.sourceDate)) throw new TypeError('Data original da mensagem divergente.');
            const editTime = message.editDate ? Date.parse(message.editDate) : null;
            const same = previous.find(row => row.payloadHash === payloadHash && (row.editDate?.getTime() ?? null) === editTime);
            if (same) {
              if (same.payloadRawJson !== envelope) throw new TypeError('Envelope de reentrega divergente; reclassificacao nao suportada.');
              return { status: 'duplicate', messageId: same.id };
            }
            const current = previous.filter(row => row.editState !== 'quarantined').sort((a, b) => (b.editDate ?? b.sourceDate).getTime() - (a.editDate ?? a.sourceDate).getTime())[0];
            // Same timestamp with different payload cannot be ordered safely.
            const stale = !!current && (editTime === null || editTime <= (current.editDate ?? current.sourceDate).getTime());
            const created = await tx.sourceMessage.create({ data: { dataSourceId: source.id, collectionRunId, externalMessageId: message.externalMessageId, revision: (previous[0]?.revision ?? 0) + 1, sourceDate: new Date(message.sourceDate), editDate: message.editDate ? new Date(message.editDate) : null, collectedAt: new Date(message.receivedAt), rawText: message.text, normalizedText, payloadHash, payloadRawJson: envelope, editState: stale ? 'quarantined' : previous.length ? 'edited' : 'original', collectorVersion: run.collectorVersion } });
            if (message.media.length) await tx.messageMedia.createMany({ data: message.media.map((media, position) => ({ sourceMessageId: created.id, mediaType: media.type, fileUniqueId: media.reference, position })) });
            if (stale) await tx.validationRecord.create({ data: { sourceMessageId: created.id, ruleCode: 'EDICAO_FORA_DE_ORDEM', severity: 'media', evidence: 'INDETERMINADO', description: 'Edicao tardia ou ambigua em quarentena; nao altera estado corrente.', validatorVersion: 'data-mvp-1' } });
            else if (!candidateRecords.length) await tx.validationRecord.create({ data: { sourceMessageId: created.id, ruleCode: 'SEM_REGISTROS', severity: 'media', evidence: 'INDETERMINADO', description: 'Mensagem sem registros delimitados; revisão necessária.', validatorVersion: 'data-mvp-1' } });
            else await tx.resultClassification.createMany({ data: classifications.map(c => ({ sourceMessageId: created.id, recordKey: c.recordKey, category: c.category, origin: c.origin ?? 'indeterminado', confidence: c.confidence, evidence: c.evidence, justification: c.justification, flagsJson: JSON.stringify(c.flags), reviewRequired: c.review, classifierVersion: 'data-mvp-1' })) });
            return { status: stale ? 'quarantined' : previous.length ? 'revised' : 'created', messageId: created.id };
          });
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (attempt >= 2 || !['P2002', 'P2034', 'P1008'].includes(code ?? '')) throw error;
        }
      }
    },
    async find(sourceId: string, externalMessageId: string): Promise<unknown[]> {
      if (!sourceId.trim() || !externalMessageId.trim()) throw new TypeError('Identidade inválida.');
      return db.sourceMessage.findMany({ where: { dataSourceId: sourceId, externalMessageId }, orderBy: { revision: 'asc' }, include: { media: true, classifications: true, validations: true } });
    },
    async findCurrent(sourceId: string, externalMessageId: string): Promise<unknown | null> {
      if (!sourceId.trim() || !externalMessageId.trim()) throw new TypeError('Identidade invalida.');
      const rows = await db.sourceMessage.findMany({ where: { dataSourceId: sourceId, externalMessageId, editState: { not: 'quarantined' } }, orderBy: { revision: 'desc' }, include: { media: true, classifications: true, validations: true } });
      return rows[0] ?? null;
    },
  };
}

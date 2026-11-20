import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { IngestInput, IngestResult, MessageRepository } from './contracts';
import { classifyRecords } from './classification';
import { validateMessage } from './validation';

type LeaseContext = { botUserId: string; leaseOwnerId: string; leaseToken: bigint };
type TelegramContext = LeaseContext & { updateId: bigint; chatId: string; userId: string; authorizationRef: string; entitiesJson?: string };

type PayloadRejection = {
  status: 'rejected';
  reason: 'invalid_payload' | 'source_date_conflict' | 'redelivery_conflict';
  message: string;
};

const rejectPayload = (reason: PayloadRejection['reason'], message: string): PayloadRejection =>
  ({ status: 'rejected', reason, message });

export async function ingestTelegramInTransaction(tx: Prisma.TransactionClient, input: IngestInput, context: TelegramContext): Promise<IngestResult | PayloadRejection> {
  return ingestInTransaction(tx, input, async source => {
    if (source.platform !== 'telegram' || source.chatType !== 'channel' || source.externalChatId !== context.chatId
      || source.ownerUserId !== context.userId || source.authorizationRef !== context.authorizationRef
      || source.activationUpdateId === null || source.activationUpdateId >= context.updateId) return false;

    const [lease, registration, activation] = await Promise.all([
      tx.telegramPollingState.findFirst({ where: { botUserId: context.botUserId, leaseOwnerId: context.leaseOwnerId,
        leaseToken: context.leaseToken, leaseExpiresAt: { gt: new Date() } }, select: { botUserId: true } }),
      tx.sourceRegistration.findFirst({ where: { resolvedSourceId: source.id, userId: context.userId,
        platform: 'telegram', status: 'active' }, select: { id: true } }),
      tx.collectionRun.findFirst({ where: { dataSourceId: source.id, botUserId: context.botUserId,
        status: 'activated' }, select: { id: true } }),
    ]);
    return !!lease && !!registration && !!activation;
  }, run => run.botUserId === context.botUserId && run.firstUpdateId === context.updateId && run.lastUpdateId === context.updateId, context.entitiesJson);
}

async function ingestInTransaction(
  tx: Prisma.TransactionClient,
  input: IngestInput,
  sourceAllowed: (source: Prisma.DataSourceGetPayload<object>) => boolean | Promise<boolean>,
  runAllowed: (run: Prisma.CollectionRunGetPayload<object>) => boolean,
  entitiesJson?: string,
): Promise<IngestResult | PayloadRejection> {
  const { message, candidateRecords, collectionRunId } = input;
  if (typeof collectionRunId !== 'string' || !collectionRunId.trim()) throw new TypeError('Invalid collection run.');
  // Payload rejections return before any DATA write. Store and programming errors still throw.
  if (!validateMessage(message) || !Array.isArray(candidateRecords)) {
    return rejectPayload('invalid_payload', 'Entrada inválida.');
  }
  const classifications = classifyRecords(candidateRecords);
  // Record evidence must be literal, supplied by the same message; no NLP segmentation.
  if (candidateRecords.some(record => !record.evidenceText.trim() || !message.text.includes(record.evidenceText))) return rejectPayload('invalid_payload', 'Evidência não pertence à mensagem.');
  const normalizedText = message.text.normalize('NFC').trim();
  // Retry envelope is immutable: exact text, ordered media and candidate records.
  const entityMetadata = entitiesJson ? { entitiesJson } : {};
  const envelope = JSON.stringify({ ...entityMetadata, text: message.text, media: message.media.map(m => [m.type, m.reference]), candidateRecords: candidateRecords.map(r => [r.recordKey, r.evidenceText]) });
  const payloadHash = createHash('sha256').update(JSON.stringify({ ...entityMetadata, text: normalizedText, media: message.media.map(m => [m.type, m.reference]) })).digest('hex');
  const source = await tx.dataSource.findUnique({ where: { id: message.sourceId } });
  if (!source?.active || source.removedAt || !source.activatedAt || source.activatedAt < source.authorizedAt
    || new Date(message.sourceDate) < source.activatedAt || !await sourceAllowed(source)) return { status: 'ineligible' };
  const run = await tx.collectionRun.findUnique({ where: { id: collectionRunId } });
  if (!run || run.dataSourceId !== source.id || !runAllowed(run)) throw new TypeError('Execução não pertence à origem.');
  const previous = await tx.sourceMessage.findMany({ where: { dataSourceId: source.id, externalMessageId: message.externalMessageId }, orderBy: { revision: 'desc' } });
  if (previous.length && previous[0].sourceDate.getTime() !== Date.parse(message.sourceDate)) return rejectPayload('source_date_conflict', 'Data original da mensagem divergente.');
  const editTime = message.editDate ? Date.parse(message.editDate) : null;
  const same = previous.find(row => row.payloadHash === payloadHash && (row.editDate?.getTime() ?? null) === editTime);
  if (same) {
    if (same.payloadRawJson !== envelope) return rejectPayload('redelivery_conflict', 'Envelope de reentrega divergente; reclassificacao nao suportada.');
    return { status: 'duplicate', messageId: same.id };
  }
  const current = previous.filter(row => row.editState !== 'quarantined').sort((a, b) => (b.editDate ?? b.sourceDate).getTime() - (a.editDate ?? a.sourceDate).getTime())[0];
  // Same timestamp with different payload cannot be ordered safely.
  const stale = !!current && (editTime === null || editTime <= (current.editDate ?? current.sourceDate).getTime());
  const created = await tx.sourceMessage.create({ data: { dataSourceId: source.id, collectionRunId, externalMessageId: message.externalMessageId, revision: (previous[0]?.revision ?? 0) + 1, sourceDate: new Date(message.sourceDate), editDate: message.editDate ? new Date(message.editDate) : null, collectedAt: new Date(message.receivedAt), rawText: message.text, normalizedText, entitiesJson, payloadHash, payloadRawJson: envelope, editState: stale ? 'quarantined' : previous.length ? 'edited' : 'original', collectorVersion: run.collectorVersion } });
  if (message.media.length) await tx.messageMedia.createMany({ data: message.media.map((media, position) => ({ sourceMessageId: created.id, mediaType: media.type, fileUniqueId: media.reference, position })) });
  if (stale) await tx.validationRecord.create({ data: { sourceMessageId: created.id, ruleCode: 'EDICAO_FORA_DE_ORDEM', severity: 'media', evidence: 'INDETERMINADO', description: 'Edicao tardia ou ambigua em quarentena; nao altera estado corrente.', validatorVersion: 'data-mvp-1' } });
  else if (!candidateRecords.length) await tx.validationRecord.create({ data: { sourceMessageId: created.id, ruleCode: 'SEM_REGISTROS', severity: 'media', evidence: 'INDETERMINADO', description: 'Mensagem sem registros delimitados; revisão necessária.', validatorVersion: 'data-mvp-1' } });
  else await tx.resultClassification.createMany({ data: classifications.map(c => {
    if (c.recordKey === null) throw new TypeError('Missing classification record key.');
    return { sourceMessageId: created.id, recordKey: c.recordKey, category: c.category, origin: c.origin ?? 'indeterminado', confidence: c.confidence, evidence: c.evidence, justification: c.justification, flagsJson: JSON.stringify(c.flags), reviewRequired: c.review, classifierVersion: 'data-mvp-1' };
  }) });
  return { status: stale ? 'quarantined' : previous.length ? 'revised' : 'created', messageId: created.id };
}

/** Synthetic-only adapter. The caller owns and disconnects the injected client. */
export function createDataRepository(client: PrismaClient): MessageRepository {
  const db = client;
  return {
    async ingest(input: IngestInput): Promise<IngestResult> {
      for (let attempt = 0; ; attempt++) {
        try {
          return await db.$transaction(async tx => {
            const result = await ingestInTransaction(tx, input,
              source => source.platform === 'synthetic' && source.authorizationRef.startsWith('synthetic:'),
              run => run.botUserId == null);
            if (result.status === 'rejected') throw new TypeError(result.message);
            return result;
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

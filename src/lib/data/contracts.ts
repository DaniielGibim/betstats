export type Category = 'GREEN' | 'RED' | 'REEMBOLSO' | 'ANULADO' | 'PENDENTE' | 'INDETERMINADO';
export interface MediaReference { type: string; reference: string }
export interface MessageInput { sourceId: string; externalMessageId: string; sourceDate: string; receivedAt: string; text: string; media: MediaReference[]; editDate?: string }
export interface Source { id: string; active: boolean; activatedAt: string }
/** Caller supplies already-delimited records; never infer boundaries from a message. */
export interface ClassificationRecord { recordKey: string; evidenceText: string }
export interface Classification { recordKey: string | null; category: Category; evidence: string | null; confidence: 'media' | 'nenhuma'; justification: string; origin: 'declarado' | null; flags: string[]; review: boolean }
/** Reentrega da mesma revisao exige texto bruto, midia ordenada e candidatos identicos; divergencia e erro, nao reclassificacao. */
export interface IngestInput { message: MessageInput; collectionRunId: string; candidateRecords: readonly ClassificationRecord[] }
export type IngestResult = { status: 'created' | 'revised' | 'quarantined' | 'duplicate' | 'ineligible'; messageId?: string };
/** Implementations must enforce uniqueness and append revisions atomically. */
export interface MessageRepository {
  ingest(input: IngestInput): Promise<IngestResult>;
  /** Full append-only history; highest revision is not necessarily current. */
  find(sourceId: string, externalMessageId: string): Promise<unknown[]>;
  findCurrent(sourceId: string, externalMessageId: string): Promise<unknown | null>;
}
import type { ClassificationRecord, MediaReference, MessageRepository } from '../data/contracts';

/** Offline event contract. No Telegram IDs, network, polling, webhook or automatic segmentation. */
export interface SyntheticEvent {
  platform: 'synthetic';
  sourceId: string;
  externalMessageId: string;
  sourceDate: string;
  receivedAt: string;
  editDate?: string;
  text: string;
  media: MediaReference[];
  candidateRecords?: readonly ClassificationRecord[];
}
export function createSyntheticAdapter(repository: MessageRepository) {
  return {
    async consume(event: SyntheticEvent, collectionRunId: string) {
      if (event.platform !== 'synthetic') throw new TypeError('Only synthetic events are supported.');
      return repository.ingest({ collectionRunId, candidateRecords: event.candidateRecords ?? [], message: {
        sourceId: event.sourceId, externalMessageId: event.externalMessageId, sourceDate: event.sourceDate,
        receivedAt: event.receivedAt, editDate: event.editDate, text: event.text, media: event.media,
      } });
    },
  };
}

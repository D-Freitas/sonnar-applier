import type { ExtractionState } from '@/src/domain/entities/job';

export interface ExtractionStateRepository {
  save(state: ExtractionState): Promise<void>;
  get(): Promise<ExtractionState | null>;
  subscribe(listener: (state: ExtractionState | null) => void): () => void;
}

import type { ExtractionState } from '@/src/domain/entities/job';
import type { ExtractionStateRepository } from '@/src/application/ports/extraction-state-repository';

const STATE_KEY = 'indeedExtraction';

export class ChromeExtractionStateRepository implements ExtractionStateRepository {
  async save(state: ExtractionState): Promise<void> {
    await chrome.storage.local.set({ [STATE_KEY]: state });
  }
  async get(): Promise<ExtractionState | null> {
    const data = await chrome.storage.local.get(STATE_KEY);
    return (data[STATE_KEY] as ExtractionState | undefined) ?? null;
  }
  subscribe(listener: (state: ExtractionState | null) => void): () => void {
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes[STATE_KEY]) listener((changes[STATE_KEY].newValue as ExtractionState | undefined) ?? null);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }
}

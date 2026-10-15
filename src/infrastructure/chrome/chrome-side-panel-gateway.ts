import type { ExtractionState } from '@/src/domain/entities/job';
import { bufferCount, concatMap, from, lastValueFrom, toArray } from 'rxjs';

const MAX_TABS_PER_BATCH = 10;

export class ChromeSidePanelGateway {
  private openingJobs = false;

  async readState(): Promise<ExtractionState | null> {
    return chrome.runtime.sendMessage({ type: 'indeed-get-state' }) as Promise<ExtractionState | null>;
  }
  async requestExtraction(): Promise<{ ok: boolean; error?: string }> {
    return chrome.runtime.sendMessage({ type: 'indeed-extract' });
  }
  async openJobs(urls: string[], onBatchChange?: (urls: string[], processing: boolean) => void): Promise<void> {
    if (this.openingJobs || urls.length === 0) return;
    this.openingJobs = true;
    try {
      await lastValueFrom(
        from(urls).pipe(
          bufferCount(MAX_TABS_PER_BATCH),
          concatMap((batch) => from(this.processBatch(batch, onBatchChange))),
          toArray(),
        ),
        { defaultValue: [] },
      );
    } finally {
      this.openingJobs = false;
    }
  }

  private async processBatch(urls: string[], onBatchChange?: (urls: string[], processing: boolean) => void): Promise<void> {
    onBatchChange?.(urls, true);
    const results = await Promise.allSettled(urls.map((url) => chrome.tabs.create({ url })));
    const tabs = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);

    try {
      const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failure) throw failure.reason;
      await new Promise<void>((resolve) => setTimeout(resolve, 5_000));
    } finally {
      await Promise.allSettled(tabs.flatMap((tab) => tab.id === undefined ? [] : [chrome.tabs.remove(tab.id)]));
      onBatchChange?.(urls, false);
    }
  }

  subscribe(listener: (state: ExtractionState | null) => void): () => void {
    const changed = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.indeedExtraction) listener((changes.indeedExtraction.newValue as ExtractionState | undefined) ?? null);
    };
    chrome.storage.onChanged.addListener(changed);
    return () => chrome.storage.onChanged.removeListener(changed);
  }
}

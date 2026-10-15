import type { JobExtraction } from '@/src/domain/entities/job';
import type { ExtractionGateway } from '@/src/application/ports/extraction-gateway';
import { extractIndeedPage } from '@/src/infrastructure/indeed/extract-indeed-page';

export class ChromeExtractionGateway implements ExtractionGateway {
  async extractFromActiveTab(): Promise<JobExtraction> {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) throw new Error('Nenhuma aba ativa encontrada.');
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractIndeedPage });
    const extraction = results[0]?.result as JobExtraction | undefined;
    if (!extraction) throw new Error('Não foi possível ler os resultados desta página.');
    return extraction;
  }
}

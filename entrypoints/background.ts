import { ExtractJobs } from '@/src/application/use-cases/extract-jobs';
import { GetExtractionState } from '@/src/application/use-cases/get-extraction-state';
import { ChromeExtractionGateway } from '@/src/infrastructure/chrome/chrome-extraction-gateway';
import { ChromeExtractionStateRepository } from '@/src/infrastructure/chrome/chrome-extraction-state-repository';

export default defineBackground(() => {
  const states = new ChromeExtractionStateRepository();
  const extractJobs = new ExtractJobs(new ChromeExtractionGateway(), states);
  const getState = new GetExtractionState(states);
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'indeed-extract') {
      void extractJobs.execute().then(() => sendResponse({ ok: true })).catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      );
      return true;
    }
    if (message?.type === 'indeed-get-state') {
      void getState.execute().then(sendResponse).catch(() => sendResponse(null));
      return true;
    }
  });
});

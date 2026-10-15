import type { Job, JobExtraction } from '@/src/domain/entities/job';

// Chrome serializes this function into the page, so its implementation must remain self-contained.
export async function extractIndeedPage(): Promise<JobExtraction> {
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const findMoreButton = (): HTMLElement | null => {
    const button = document.querySelector<HTMLElement>('[data-cy="show-more"]');
    if (button && !(button as HTMLButtonElement).disabled && button.getAttribute('aria-disabled') !== 'true' && button.getClientRects().length > 0) return button;
    return null;
  };
  const collectJobs = (): Job[] => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/viewjob"], a[data-jk], h2 a[href]')];
    const seen = new Set<string>();
    const jobs: Job[] = [];
    for (const link of links) {
      const title = link.innerText?.trim();
      const url = link.href;
      if (!title || !url || seen.has(url)) continue;
      const card = link.closest<HTMLElement>('.mosaic-provider-jobcards-1k6cgqp')
        || link.closest<HTMLElement>('[data-testid*="slider_item"], [data-testid*="job"], .job_seen_beacon, li')
        || link.parentElement;
      if (!card) continue;
      const companyElement = card.querySelector<HTMLElement>('[data-testid="company-name"], [data-testid*="company"], .companyName');
      seen.add(url);
      const typeElement = card.matches('.mosaic-provider-jobcards-1k6cgqp') ? card : card.querySelector<HTMLElement>('.mosaic-provider-jobcards-1k6cgqp');
      const text = (typeElement?.innerText || card.innerText || card.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const easyApply = /candidat(?:e-se|ar-se) facilmente|easy apply|easily apply|apply with indeed|indeed apply/.test(text);
      jobs.push({ tipo: easyApply ? 'Candidate-se facilmente' : 'Vaga padrão', candidateSeFacilmente: easyApply, vaga: title, empresa: companyElement?.innerText?.trim() || null, paginaDaVaga: url });
    }
    return jobs;
  };

  while (true) {
    const button = findMoreButton();
    if (!button) break;
    const before = collectJobs().length;
    button.click();
    let updated = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      await sleep(500);
      if (collectJobs().length > before) { updated = true; break; }
      if (!findMoreButton() && attempt >= 5) break;
    }
    if (!updated) break;
  }
  const vagasCarregadas = collectJobs();
  const applyLink = document.querySelector<HTMLAnchorElement>('[data-testid=primary-apply-action] a')?.href || null;
  const replaceSelectedEasyApplyLink = (jobs: Job[]): Job[] => {
    if (!applyLink) return jobs;

    const sourceLink = new URL(location.href);
    const sourceJobKey = sourceLink.searchParams.get('jk');
    return jobs.map((job) => {
      if (!job.candidateSeFacilmente) return job;
      let matchesSelectedJob = job.paginaDaVaga === location.href;
      try {
        const jobUrl = new URL(job.paginaDaVaga);
        matchesSelectedJob ||= Boolean(sourceJobKey && jobUrl.searchParams.get('jk') === sourceJobKey);
      } catch {
        // Ignore malformed job URLs; they cannot refer to the selected job.
      }
      return matchesSelectedJob ? { ...job, paginaDaVaga: applyLink } : job;
    });
  };
  return {
    vagasCarregadas: replaceSelectedEasyApplyLink(vagasCarregadas),
    linkCandidaturaVagaSelecionada: applyLink,
  };
}

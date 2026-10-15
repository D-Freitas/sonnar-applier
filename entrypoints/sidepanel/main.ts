import type { Job, ExtractionState } from '@/src/domain/entities/job';
import { ChromeSidePanelGateway } from '@/src/infrastructure/chrome/chrome-side-panel-gateway';

type State = ExtractionState | null;

const statusEl = document.querySelector<HTMLDivElement>('#status')!;
const loaderEl = document.querySelector<HTMLDivElement>('#loader')!;
const toolbarLabel = document.querySelector<HTMLSpanElement>('#toolbar-label')!;
const summaryRow = document.querySelector<HTMLDivElement>('#summary-row')!;
const canvas = document.querySelector<HTMLCanvasElement>('#neural-canvas')!;
const canvasContext = canvas.getContext('2d');
const resultsEl = document.querySelector<HTMLElement>('#results')!;
const jobsEl = document.querySelector<HTMLDivElement>('#jobs')!;
const retryButton = document.querySelector<HTMLButtonElement>('#retry')!;
const selectAll = document.querySelector<HTMLInputElement>('#select-all')!;
const selectEasy = document.querySelector<HTMLInputElement>('#select-easy')!;
const selectStandard = document.querySelector<HTMLInputElement>('#select-standard')!;
const applyButton = document.querySelector<HTMLButtonElement>('#apply')!;
const gateway = new ChromeSidePanelGateway();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
type TrailPoint = { x: number; y: number };
type Neuron = { x: number; y: number; vx: number; vy: number; phase: number; trail: TrailPoint[] };
const neurons: Neuron[] = Array.from({ length: 58 }, (_, index) => ({
  x: 0.04 + Math.random() * 0.92,
  y: 0.04 + Math.random() * 0.88,
  vx: (Math.random() - 0.5) * 0.025,
  vy: (Math.random() - 0.5) * 0.025,
  phase: Math.random() * Math.PI * 2 + index * 0.17,
  trail: [],
}));
let animationFrame = 0;
let animationRunning = false;
let lastMotionTime = 0;
let lastTrailTime = 0;

function paintNeuralNetwork(time: number): void {
  if (!canvasContext) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const delta = lastMotionTime ? Math.min((time - lastMotionTime) / 1000, 0.04) : 0;
  lastMotionTime = time;
  canvasContext.fillStyle = 'rgba(8, 14, 10, 0.18)';
  canvasContext.fillRect(0, 0, width, height);

  for (const neuron of neurons) {
    neuron.vx += (Math.sin(time * 0.00031 + neuron.phase) * 0.006 + Math.cos(time * 0.00019 + neuron.phase * 1.7) * 0.003) * delta;
    neuron.vy += (Math.cos(time * 0.00027 + neuron.phase * 1.3) * 0.006 + Math.sin(time * 0.00017 + neuron.phase) * 0.003) * delta;
    neuron.vx *= 1 - delta * 0.28;
    neuron.vy *= 1 - delta * 0.28;
    const speed = Math.hypot(neuron.vx, neuron.vy);
    if (speed > 0.022) { neuron.vx *= 0.022 / speed; neuron.vy *= 0.022 / speed; }
    neuron.x += neuron.vx * delta;
    neuron.y += neuron.vy * delta;
    if (neuron.x < 0.02 || neuron.x > 0.98) { neuron.x = Math.max(0.02, Math.min(0.98, neuron.x)); neuron.vx *= -1; }
    if (neuron.y < 0.03 || neuron.y > 0.91) { neuron.y = Math.max(0.03, Math.min(0.91, neuron.y)); neuron.vy *= -1; }
  }
  if (time - lastTrailTime > 42) {
    for (const neuron of neurons) {
      neuron.trail.push({ x: neuron.x, y: neuron.y });
      if (neuron.trail.length > 13) neuron.trail.shift();
    }
    lastTrailTime = time;
  }

  const points = neurons.map((neuron) => ({ x: 5 + neuron.x * (width - 10), y: 4 + neuron.y * (height - 22) }));
  neurons.forEach((neuron) => {
    if (neuron.trail.length < 2) return;
    for (let index = 1; index < neuron.trail.length; index++) {
      const from = neuron.trail[index - 1];
      const to = neuron.trail[index];
      const fade = index / neuron.trail.length;
      canvasContext!.beginPath();
      canvasContext!.moveTo(5 + from.x * (width - 10), 4 + from.y * (height - 22));
      canvasContext!.lineTo(5 + to.x * (width - 10), 4 + to.y * (height - 22));
      canvasContext!.strokeStyle = `rgba(185, 242, 124, ${fade * 0.23})`;
      canvasContext!.lineWidth = 0.6 + fade * 0.7;
      canvasContext!.stroke();
    }
  });
  const edges: Array<{ from: number; to: number; distance: number }> = [];
  const maxDistance = Math.min(92, width * 0.34);

  for (let from = 0; from < points.length; from++) {
    for (let to = from + 1; to < points.length; to++) {
      const dx = points[from].x - points[to].x;
      const dy = points[from].y - points[to].y;
      const distance = Math.hypot(dx, dy);
      if (distance >= maxDistance) continue;
      edges.push({ from, to, distance });
      canvasContext.beginPath();
      canvasContext.moveTo(points[from].x, points[from].y);
      canvasContext.lineTo(points[to].x, points[to].y);
      canvasContext.strokeStyle = `rgba(185, 242, 124, ${(1 - distance / maxDistance) * 0.25})`;
      canvasContext.lineWidth = 0.7;
      canvasContext.stroke();
    }
  }

  edges.filter((_edge, index) => index % 4 === 0).forEach((edge, index) => {
    const progress = (time * 0.00016 + index * 0.173) % 1;
    const tailProgress = Math.max(0, progress - 0.2);
    const start = { x: points[edge.from].x + (points[edge.to].x - points[edge.from].x) * tailProgress, y: points[edge.from].y + (points[edge.to].y - points[edge.from].y) * tailProgress };
    const end = { x: points[edge.from].x + (points[edge.to].x - points[edge.from].x) * progress, y: points[edge.from].y + (points[edge.to].y - points[edge.from].y) * progress };
    const signal = canvasContext!.createLinearGradient(start.x, start.y, end.x, end.y);
    signal.addColorStop(0, 'rgba(185, 242, 124, 0)');
    signal.addColorStop(1, 'rgba(235, 255, 216, 0.95)');
    canvasContext.beginPath();
    canvasContext.moveTo(start.x, start.y);
    canvasContext.lineTo(end.x, end.y);
    canvasContext.strokeStyle = signal;
    canvasContext.lineWidth = 1.5;
    canvasContext.shadowColor = '#b9f27c';
    canvasContext.shadowBlur = 11;
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.arc(end.x, end.y, 1.8, 0, Math.PI * 2);
    canvasContext.fillStyle = 'rgba(238, 255, 222, 0.98)';
    canvasContext.fill();
    canvasContext.shadowBlur = 0;
  });

  points.forEach((point, index) => {
    const pulse = (time * 0.00018 + neurons[index].phase / (Math.PI * 2)) % 1;
    if (index % 5 === 0) {
      canvasContext!.beginPath();
      canvasContext!.arc(point.x, point.y, 2 + pulse * 10, 0, Math.PI * 2);
      canvasContext!.strokeStyle = `rgba(185, 242, 124, ${(1 - pulse) * 0.3})`;
      canvasContext!.lineWidth = 0.7;
      canvasContext!.stroke();
    }
    const radius = 1 + (Math.sin(time * 0.002 + neurons[index].phase) + 1) * 0.5;
    canvasContext!.beginPath();
    canvasContext!.arc(point.x, point.y, radius, 0, Math.PI * 2);
    canvasContext!.fillStyle = 'rgba(205, 255, 166, 0.86)';
    canvasContext!.shadowColor = '#b9f27c';
    canvasContext!.shadowBlur = 7;
    canvasContext!.fill();
    canvasContext!.shadowBlur = 0;
  });
}

function stopNeuralAnimation(): void {
  animationRunning = false;
  cancelAnimationFrame(animationFrame);
}

function setLoading(loading: boolean): void {
  loaderEl.classList.toggle('hidden', !loading);
  statusEl.classList.toggle('hidden', loading);
  summaryRow.classList.toggle('is-loading', loading);
  summaryRow.setAttribute('aria-busy', String(loading));
  toolbarLabel.textContent = loading ? 'LISTANDO OPORTUNIDADES' : 'RESULTADOS DA BUSCA';
  if (!loading) {
    stopNeuralAnimation();
    return;
  }
  if (animationRunning || !canvasContext) return;
  animationRunning = true;
  const draw = (time: number) => {
    paintNeuralNetwork(time);
    if (animationRunning && !reducedMotion) animationFrame = requestAnimationFrame(draw);
  };
  draw(performance.now());
}

function setStatus(message: string, error = false): void {
  statusEl.textContent = message;
  statusEl.classList.remove('hidden');
  statusEl.classList.toggle('error', error);
}

function render(state: State): void {
  if (!state) return;
  retryButton.disabled = state.status === 'running';
  if (state.status === 'running') {
    resultsEl.classList.remove('hidden');
    selectAll.disabled = true;
    selectEasy.disabled = true;
    selectStandard.disabled = true;
    applyButton.disabled = true;
    setLoading(true);
    return;
  }
  setLoading(false);
  if (state.status === 'error') {
    resultsEl.classList.add('hidden');
    setStatus(state.message ?? 'Falha ao extrair vagas.', true);
    return;
  }
  const extraction = state.extraction;
  if (!extraction) return;
  const jobs = extraction.vagasCarregadas;
  setStatus(`Extração concluída. ${jobs.length} vaga${jobs.length === 1 ? '' : 's'} encontrada${jobs.length === 1 ? '' : 's'}.`);
  resultsEl.classList.remove('hidden');
  document.querySelector('#count')!.textContent = String(jobs.length);
  document.querySelector('#company-count')!.textContent = String(new Set(jobs.map((job) => job.empresa).filter(Boolean)).size);
  const easyCount = jobs.filter((job) => job.candidateSeFacilmente).length;
  const easyPercent = jobs.length ? Math.round((easyCount / jobs.length) * 100) : 0;
  const businessPercent = jobs.length ? 100 - easyPercent : 0;
  const chart = document.querySelector<HTMLDivElement>('#apply-chart')!;
  chart.style.setProperty('--easy-share', `${easyPercent}%`);
  chart.setAttribute('aria-label', `Easy apply ${easyPercent}%, Business website ${businessPercent}%`);
  document.querySelector('#easy-percent')!.textContent = `${easyPercent}%`;
  jobsEl.replaceChildren();
  selectAll.checked = false;
  selectAll.indeterminate = false;
  applyButton.disabled = true;
  if (!jobs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nenhuma vaga encontrada nesta página. Abra uma listagem de busca no Indeed e tente novamente.';
    jobsEl.append(empty);
  }
  for (const job of jobs) {
    const card = document.createElement('article');
    card.className = 'job';
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Selecionar vaga: ${job.vaga}`);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'job-checkbox';
    checkbox.value = job.paginaDaVaga;
    checkbox.dataset.easyApply = String(job.candidateSeFacilmente);
    checkbox.setAttribute('aria-label', `Selecionar ${job.vaga}`);
    const info = document.createElement('div');
    info.className = 'job-info';
    const title = document.createElement('a');
    title.className = 'job-title'; title.href = job.paginaDaVaga; title.target = '_blank'; title.rel = 'noreferrer';
    title.textContent = job.vaga;
    const company = document.createElement('span'); company.className = 'company'; company.textContent = `↳ ${job.empresa || 'Empresa não identificada'}`;
    const tags = document.createElement('span'); tags.className = 'job-tags';
    const applyType = document.createElement('span');
    applyType.className = job.candidateSeFacilmente ? 'job-tag job-tag-easy-apply' : 'job-tag';
    applyType.textContent = job.tipo;
    applyType.dataset.originalText = job.tipo;
    tags.append(applyType);
    info.append(title, company, tags);
    card.append(checkbox, info);
    jobsEl.append(card);
  }
  selectAll.disabled = jobs.length === 0;
  selectEasy.disabled = jobs.length === 0 || easyCount === 0;
  selectStandard.disabled = jobs.length === 0 || easyCount === jobs.length;
  updateSelection();
}

function updateSelection(): void {
  const checkboxes = [...jobsEl.querySelectorAll<HTMLInputElement>('.job-checkbox')];
  const selected = checkboxes.filter((checkbox) => checkbox.checked).length;
  for (const checkbox of checkboxes) checkbox.closest('.job')?.classList.toggle('is-selected', checkbox.checked);
  selectAll.checked = checkboxes.length > 0 && selected === checkboxes.length;
  selectAll.indeterminate = selected > 0 && selected < checkboxes.length;
  for (const [control, isEasyApply] of [[selectEasy, true], [selectStandard, false]] as const) {
    const group = checkboxes.filter((checkbox) => checkbox.dataset.easyApply === String(isEasyApply));
    const selectedGroup = group.filter((checkbox) => checkbox.checked).length;
    control.checked = group.length > 0 && selectedGroup === group.length;
    control.indeterminate = selectedGroup > 0 && selectedGroup < group.length;
  }
  applyButton.disabled = selected === 0;
}

function selectGroup(control: HTMLInputElement, predicate: (checkbox: HTMLInputElement) => boolean): void {
  jobsEl.querySelectorAll<HTMLInputElement>('.job-checkbox').forEach((checkbox) => {
    if (predicate(checkbox)) checkbox.checked = control.checked;
  });
  updateSelection();
}

function setBatchProcessing(urls: string[], processing: boolean): void {
  const batchUrls = new Set(urls);
  for (const checkbox of jobsEl.querySelectorAll<HTMLInputElement>('.job-checkbox')) {
    if (!batchUrls.has(checkbox.value)) continue;
    const tag = checkbox.closest('.job')?.querySelector<HTMLElement>('.job-tag');
    if (tag) {
      tag.classList.toggle('is-processing', processing);
      tag.textContent = processing ? 'Processando' : tag.dataset.originalText || '';
    }
  }
}

selectAll.addEventListener('change', () => selectGroup(selectAll, () => true));
selectEasy.addEventListener('change', () => selectGroup(selectEasy, (checkbox) => checkbox.dataset.easyApply === 'true'));
selectStandard.addEventListener('change', () => selectGroup(selectStandard, (checkbox) => checkbox.dataset.easyApply === 'false'));

jobsEl.addEventListener('change', (event) => {
  if ((event.target as HTMLInputElement).matches('.job-checkbox')) updateSelection();
});

jobsEl.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('a, input, button, label')) return;
  const card = target.closest<HTMLElement>('.job');
  const checkbox = card?.querySelector<HTMLInputElement>('.job-checkbox');
  if (!checkbox) return;
  checkbox.checked = !checkbox.checked;
  updateSelection();
});

jobsEl.addEventListener('keydown', (event) => {
  if (event.target !== event.currentTarget && !(event.target as HTMLElement).matches('.job')) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = (event.target as HTMLElement).closest<HTMLElement>('.job');
  const checkbox = card?.querySelector<HTMLInputElement>('.job-checkbox');
  if (!checkbox) return;
  event.preventDefault();
  checkbox.checked = !checkbox.checked;
  updateSelection();
});

applyButton.addEventListener('click', async () => {
  const selectedUrls = [...jobsEl.querySelectorAll<HTMLInputElement>('.job-checkbox:checked')].map((checkbox) => checkbox.value);
  applyButton.disabled = true;
  try {
    await gateway.openJobs(selectedUrls, setBatchProcessing);
  } finally {
    updateSelection();
  }
});

async function readState(): Promise<void> {
  const state = await gateway.readState();
  render(state);
}

async function startExtraction(): Promise<void> {
  retryButton.disabled = true;
  resultsEl.classList.remove('hidden');
  selectAll.disabled = true;
  applyButton.disabled = true;
  setLoading(true);
  try {
    const response = await gateway.requestExtraction();
    if (!response?.ok) throw new Error(response?.error ?? 'Não foi possível iniciar a extração.');
  } catch (error) {
    setLoading(false);
    resultsEl.classList.add('hidden');
    setStatus(error instanceof Error ? error.message : String(error), true);
    retryButton.disabled = false;
  }
}

class SidePanelController {
  start(): void {
    void this.showActiveSiteBrand();
    retryButton.addEventListener('click', () => void startExtraction());
    gateway.subscribe(render);
    void readState().then(() => startExtraction());
  }

  private async showActiveSiteBrand(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url) return;
    try {
      const pageUrl = new URL(tab.url);
      const labels = pageUrl.hostname.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
      const compoundSuffixes = new Set(['com.br', 'com.mx', 'com.ar', 'com.au', 'com.tr', 'com.sg', 'com.hk', 'co.uk', 'co.jp', 'co.nz', 'co.in', 'co.za']);
      const suffix = labels.slice(-2).join('.');
      const domainIndex = Math.max(0, labels.length - (compoundSuffixes.has(suffix) ? 3 : 2));
      document.querySelector<HTMLElement>('#site-name')!.textContent = labels[domainIndex] || pageUrl.hostname;
      const icon = document.querySelector<HTMLImageElement>('#site-icon')!;
      icon.src = tab.favIconUrl || new URL('/favicon.ico', pageUrl.origin).href;
      icon.onerror = () => icon.classList.add('hidden');
    } catch {
      // Extension and browser-internal URLs do not have a site brand.
    }
  }
}

new SidePanelController().start();

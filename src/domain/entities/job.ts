export type Job = {
  tipo: 'Candidate-se facilmente' | 'Vaga padrão';
  candidateSeFacilmente: boolean;
  vaga: string;
  empresa: string | null;
  paginaDaVaga: string;
};

export type JobExtraction = {
  vagasCarregadas: Job[];
  linkCandidaturaVagaSelecionada: string | null;
};

export type ExtractionState =
  | { status: 'running'; updatedAt: number }
  | { status: 'done'; extraction: JobExtraction; updatedAt: number }
  | { status: 'error'; message: string; updatedAt: number };

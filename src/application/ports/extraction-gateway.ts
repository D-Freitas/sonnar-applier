import type { JobExtraction } from '@/src/domain/entities/job';

export interface ExtractionGateway {
  extractFromActiveTab(): Promise<JobExtraction>;
}

import type { ExtractionGateway } from '@/src/application/ports/extraction-gateway';
import type { ExtractionStateRepository } from '@/src/application/ports/extraction-state-repository';
import type { ExtractionState } from '@/src/domain/entities/job';

export class ExtractJobs {
  constructor(
    private readonly gateway: ExtractionGateway,
    private readonly states: ExtractionStateRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(): Promise<void> {
    await this.states.save({ status: 'running', updatedAt: this.now() });
    let state: ExtractionState;
    try {
      state = { status: 'done', extraction: await this.gateway.extractFromActiveTab(), updatedAt: this.now() };
    } catch (error) {
      state = { status: 'error', message: error instanceof Error ? error.message : String(error), updatedAt: this.now() };
    }
    await this.states.save(state);
  }
}

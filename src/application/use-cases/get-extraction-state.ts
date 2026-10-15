import type { ExtractionStateRepository } from '@/src/application/ports/extraction-state-repository';

export class GetExtractionState {
  constructor(private readonly states: ExtractionStateRepository) {}
  execute() { return this.states.get(); }
}

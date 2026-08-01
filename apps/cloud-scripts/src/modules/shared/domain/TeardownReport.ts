export type TeardownOutcome = 'removed' | 'absent' | 'kept';

export interface TeardownStep {
  target: string;
  outcome: TeardownOutcome;
  detail?: string;
}

export class TeardownReport {
  private readonly steps: TeardownStep[] = [];

  public record(
    target: string,
    outcome: TeardownOutcome,
    detail?: string,
  ): void {
    this.steps.push(detail ? { target, outcome, detail } : { target, outcome });
  }

  public get entries(): readonly TeardownStep[] {
    return this.steps;
  }

  public toNotes(): string {
    if (!this.steps.length) return 'nothing to tear down';

    return this.steps
      .map(
        (step) =>
          `${step.target}: ${step.outcome}${step.detail ? ` (${step.detail})` : ''}`,
      )
      .join('; ');
  }
}

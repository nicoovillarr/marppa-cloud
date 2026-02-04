import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerMmiOptionalProps {
  id?: number;
}

export class WorkerMmiEntity extends PatchableEntity {
  public readonly id: number | null;

  constructor(
    public readonly type: string,
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly diskGB: number,
    public readonly familyId: string,
    optionals: WorkerMmiOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? null;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      cpuCores: this.cpuCores,
      ramMB: this.ramMB,
      diskGB: this.diskGB,
      familyId: this.familyId,
    };
  }
}
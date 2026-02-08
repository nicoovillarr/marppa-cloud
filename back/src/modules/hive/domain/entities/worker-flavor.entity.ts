import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerFlavorOptionalProps {
  id?: number;
}

export class WorkerFlavorEntity extends PatchableEntity {

  @PrimaryKey()
  public readonly id?: number;

  constructor(
    public readonly name: string,
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly diskGB: number,
    public readonly familyId: number,
    optionals: WorkerFlavorOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id ?? undefined,
      name: this.name,
      cpuCores: this.cpuCores,
      ramMB: this.ramMB,
      diskGB: this.diskGB,
      familyId: this.familyId,
    };
  }

  static fromObject(data: Record<string, any>): WorkerFlavorEntity {
    return new WorkerFlavorEntity(
      data.name,
      data.cpuCores,
      data.ramMB,
      data.diskGB,
      data.familyId,
      {
        id: data.id,
      }
    );
  }
}
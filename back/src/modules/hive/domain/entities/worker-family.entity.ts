import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerFamilyOptionalProps {
  id?: number;
  description?: string;
}

export class WorkerFamilyEntity extends PatchableEntity {

  @PrimaryKey()
  public readonly id?: number;
  
  public readonly description?: string;

  constructor(
    public readonly name: string,
    optionals: WorkerFamilyOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.description = optionals.description ?? undefined;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id ?? undefined,
      name: this.name,
      description: this.description,
    };
  }

  static fromObject(data: Record<string, any>): WorkerFamilyEntity {
    return new WorkerFamilyEntity(
      data.name,
      {
        id: data.id,
        description: data.description,
      }
    );
  }
}
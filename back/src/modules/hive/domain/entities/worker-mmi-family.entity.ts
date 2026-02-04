import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerMmiFamilyOptionalProps {
  id?: string;
  description?: string;
}

export class WorkerMmiFamilyEntity extends PatchableEntity {
  public readonly id: string | null;
  public readonly description: string | null;

  constructor(
    public readonly name: string,
    optionals: WorkerMmiFamilyOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? null;
    this.description = optionals.description ?? null;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
    };
  }
}
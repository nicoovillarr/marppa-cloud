import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerStorageTypeOptionalProps {
  id?: string;
}

export class WorkerStorageTypeEntity extends PatchableEntity {
  public readonly id: string | null;

  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly persistent: boolean,
    public readonly attachable: boolean,
    public readonly shared: boolean,
    optionals: WorkerStorageTypeOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? null;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      persistent: this.persistent,
      attachable: this.attachable,
      shared: this.shared,
    };
  }
}
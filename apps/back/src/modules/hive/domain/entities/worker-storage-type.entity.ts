import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface WorkerStorageTypeOptionalProps {
  id?: number;
  description?: string;
}

export class WorkerStorageTypeEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly description?: string;

  constructor(
    public readonly name: string,
    public readonly persistent: boolean,
    public readonly attachable: boolean,
    public readonly shared: boolean,
    optionals: WorkerStorageTypeOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.description = optionals.description ?? undefined;
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

  static fromObject(data: Record<string, any>): WorkerStorageTypeEntity {
    return new WorkerStorageTypeEntity(
      data.name,
      data.persistent,
      data.attachable,
      data.shared,
      {
        id: data.id,
        description: data.description,
      },
    );
  }
}

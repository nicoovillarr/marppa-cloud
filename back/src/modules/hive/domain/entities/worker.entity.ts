import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

interface WorkerOptionalProps {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class WorkerEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly macAddress: string,
    public readonly createdBy: string,
    public readonly imageId: number,
    public readonly flavorId: number,
    public readonly ownerId: string,
    optionals: WorkerOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      macAddress: this.macAddress,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      ownerId: this.ownerId,
      imageId: this.imageId,
      flavorId: this.flavorId,
    };
  }

  static fromObject(data: Record<string, any>): WorkerEntity {
    return new WorkerEntity(
      data.name,
      data.status,
      data.macAddress,
      data.createdBy,
      data.imageId,
      data.flavorId,
      data.ownerId,
      {
        id: data.id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    );
  }
}

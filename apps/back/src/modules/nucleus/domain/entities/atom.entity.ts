import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

interface AtomOptionalProps {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class AtomEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly createdBy: string,
    public readonly imageId: number,
    public readonly ownerId: string,
    optionals: AtomOptionalProps = {},
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
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      ownerId: this.ownerId,
      imageId: this.imageId,
    };
  }

  static fromObject(data: Record<string, any>): AtomEntity {
    return new AtomEntity(
      data.name,
      data.status,
      data.createdBy,
      data.imageId,
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

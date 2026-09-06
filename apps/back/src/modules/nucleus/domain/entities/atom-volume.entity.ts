import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

interface AtomVolumeOptionalProps {
  id?: number;
  mountPoint?: string | null;
  hostPath?: string;
  atomId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class AtomVolumeEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly hostPath?: string;
  public readonly mountPoint?: string | null;
  public readonly atomId?: string | null;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly sizeGiB: number,
    public readonly ownerId: string,
    public readonly createdBy: string,

    optionals: AtomVolumeOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.hostPath = optionals.hostPath;
    this.mountPoint = optionals.mountPoint ?? null;
    this.atomId = optionals.atomId;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      sizeGiB: this.sizeGiB,
      hostPath: this.hostPath,
      mountPoint: this.mountPoint,
      ownerId: this.ownerId,
      atomId: this.atomId,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }

  static fromObject(data: Record<string, any>): AtomVolumeEntity {
    return new AtomVolumeEntity(
      data.name,
      data.status,
      data.sizeGiB,
      data.ownerId,
      data.createdBy,
      {
        id: data.id,
        mountPoint: data.mountPoint,
        hostPath: data.hostPath,
        atomId: data.atomId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    );
  }
}

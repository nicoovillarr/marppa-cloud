import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

interface WorkerDiskOptionalProps {
  id?: number;
  hostPath?: string;
  mountPoint?: string;
  deviceTarget?: string;
  isBoot?: boolean;
  workerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class WorkerDiskEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly hostPath?: string;
  public readonly mountPoint?: string;
  public readonly deviceTarget?: string;
  public readonly isBoot: boolean;
  public readonly workerId?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly sizeGiB: number,
    public readonly ownerId: string,
    public readonly storageTypeId: number,
    public readonly createdBy: string,

    optionals: WorkerDiskOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.hostPath = optionals.hostPath;
    this.mountPoint = optionals.mountPoint;
    this.deviceTarget = optionals.deviceTarget;
    this.isBoot = optionals.isBoot ?? false;
    this.workerId = optionals.workerId;
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
      ownerId: this.ownerId,
      storageTypeId: this.storageTypeId,
      mountPoint: this.mountPoint,
      deviceTarget: this.deviceTarget,
      isBoot: this.isBoot,
      workerId: this.workerId,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }

  static fromObject(data: Record<string, any>): WorkerDiskEntity {
    return new WorkerDiskEntity(
      data.name,
      data.status,
      data.sizeGiB,
      data.ownerId,
      data.storageTypeId,
      data.createdBy,
      {
        id: data.id,
        hostPath: data.hostPath,
        mountPoint: data.mountPoint,
        deviceTarget: data.deviceTarget,
        isBoot: data.isBoot,
        workerId: data.workerId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    );
  }
}

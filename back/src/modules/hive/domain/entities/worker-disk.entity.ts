import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerDiskOptionalProps {
  id?: number;
  mountPoint?: string;
  isBoot?: boolean;
  workerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class WorkerDiskEntity extends PatchableEntity {

  @PrimaryKey()
  public readonly id?: number;

  public readonly mountPoint?: string;
  public readonly isBoot: boolean;
  public readonly workerId?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly sizeGiB: number,
    public readonly hostPath: string,
    public readonly ownerId: string,
    public readonly storageTypeId: number,
    public readonly createdBy: string,

    optionals: WorkerDiskOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.mountPoint = optionals.mountPoint;
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
      sizeGiB: this.sizeGiB,
      hostPath: this.hostPath,
      ownerId: this.ownerId,
      storageTypeId: this.storageTypeId,
      mountPoint: this.mountPoint,
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
      data.sizeGiB,
      data.hostPath,
      data.ownerId,
      data.storageTypeId,
      data.createdBy,
      {
        id: data.id,
        mountPoint: data.mountPoint,
        isBoot: data.isBoot,
        workerId: data.workerId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      }
    );
  }
}
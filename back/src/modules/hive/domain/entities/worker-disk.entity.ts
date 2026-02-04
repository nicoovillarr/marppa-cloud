import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerDiskOptionalProps {
  id?: string;
  mountPoint?: string;
  isBoot?: boolean;
  workerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class WorkerDiskEntity extends PatchableEntity {
  public readonly id: string | null;
  public readonly mountPoint: string | null;
  public readonly isBoot: boolean | null;
  public readonly workerId: string | null;
  public readonly createdAt: Date | null;
  public readonly updatedAt: Date | null;
  public readonly updatedBy: string | null;

  constructor(
    public readonly name: string,
    public readonly sizeGiB: number,
    public readonly hostPath: string,
    public readonly ownerId: string,
    public readonly storageTypeId: string,
    public readonly createdBy: string,

    optionals: WorkerDiskOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? null;
    this.mountPoint = optionals.mountPoint ?? null;
    this.isBoot = optionals.isBoot ?? null;
    this.workerId = optionals.workerId ?? null;
    this.createdAt = optionals.createdAt ?? null;
    this.updatedAt = optionals.updatedAt ?? null;
    this.updatedBy = optionals.updatedBy ?? null;
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
}
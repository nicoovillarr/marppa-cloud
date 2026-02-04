import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";

interface WorkerOptionalProps {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class WorkerEntity extends PatchableEntity {
  public readonly id: string | null;
  public readonly createdAt: Date | null;
  public readonly updatedAt: Date | null;
  public readonly updatedBy: string | null;

  constructor(
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly macAddress: string,
    public readonly createdBy: string,
    public readonly imageId: number,
    public readonly instanceTypeId: number,
    public readonly ownerId: string,
    optionals: WorkerOptionalProps = {}
  ) {
    super();

    this.id = optionals.id ?? null;
    this.createdAt = optionals.createdAt ?? null;
    this.updatedAt = optionals.updatedAt ?? null;
    this.updatedBy = optionals.updatedBy ?? null;
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
      instanceTypeId: this.instanceTypeId,
    };
  }
}
import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@prisma/client';

interface NodeOptionalProps {
  id?: string;
  workerId?: string;
  atomId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class NodeEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly workerId?: string;
  public readonly atomId?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly ipAddress: string,
    public readonly status: ResourceStatus,
    public readonly zoneId: string,
    public readonly createdBy: string,
    optionals: NodeOptionalProps,
  ) {
    super();

    this.id = optionals.id;
    this.workerId = optionals.workerId;
    this.atomId = optionals.atomId;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
  }

  public toObject(): Record<string, any> {
    return {
      id: this.id,
      ipAddress: this.ipAddress,
      status: this.status,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      zoneId: this.zoneId,
      workerId: this.workerId,
    };
  }

  public static fromObject(object: Record<string, any>): NodeEntity {
    return new NodeEntity(
      object.ipAddress,
      object.status,
      object.zoneId,
      object.createdBy,
      {
        id: object.id,
        workerId: object.workerId,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
      },
    );
  }
}

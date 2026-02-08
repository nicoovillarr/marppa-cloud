import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";
import { ResourceStatus } from "@prisma/client";

interface FiberOptionalProps {
  id?: number;
  hostPort?: number;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class FiberEntity extends PatchableEntity {

  @PrimaryKey()
  public readonly id?: number;

  public readonly hostPort?: number;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly protocol: string,
    public readonly targetPort: number,
    public readonly status: ResourceStatus,
    public readonly nodeId: string,
    public readonly createdBy: string,
    optionals: FiberOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.hostPort = optionals.hostPort;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
  }

  public toObject(): Record<string, any> {
    return {
      id: this.id,
      protocol: this.protocol,
      hostPort: this.hostPort,
      targetPort: this.targetPort,
      status: this.status,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      nodeId: this.nodeId,
    };
  }

  public static fromObject(object: Record<string, any>): FiberEntity {
    return new FiberEntity(
      object.protocol,
      object.targetPort,
      object.status,
      object.nodeId,
      object.createdBy,
      {
        id: object.id,
        hostPort: object.hostPort,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
      },
    );
  }
}
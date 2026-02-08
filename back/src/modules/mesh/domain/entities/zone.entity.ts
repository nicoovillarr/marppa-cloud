import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";

interface ZoneOptionalProps {
  id?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class ZoneEntity extends PatchableEntity {

  @PrimaryKey()
  public readonly id?: string;

  public readonly description?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly status: ResourceStatus,
    public readonly cidr: string,
    public readonly gateway: string,
    public readonly createdBy: string,
    public readonly ownerId: string,
    optionals: ZoneOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.description = optionals.description;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
  }

  public toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      cidr: this.cidr,
      gateway: this.gateway,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      ownerId: this.ownerId,
    };
  }

  public static fromObject(object: Record<string, any>): ZoneEntity {
    return new ZoneEntity(
      object.name,
      object.status,
      object.cidr,
      object.gateway,
      object.createdBy,
      object.ownerId,
      {
        id: object.id,
        description: object.description,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
      },
    );
  }
}
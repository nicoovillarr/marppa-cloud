import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { TransponderMode } from '@prisma/client';

interface TransponderOptionalProps {
  id?: string;
  mode?: TransponderMode;
  cacheEnabled?: boolean;
  allowCookies?: boolean;
  gzipEnabled?: boolean;
  priority?: number;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  nodeId?: string;
}

export class TransponderEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly mode?: TransponderMode;
  public readonly cacheEnabled?: boolean;
  public readonly allowCookies?: boolean;
  public readonly gzipEnabled?: boolean;
  public readonly priority?: number;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;
  public readonly nodeId?: string;

  constructor(
    public readonly path: string,
    public readonly port: number,
    public readonly status: ResourceStatus,
    public readonly createdBy: string,
    public readonly portalId: string,
    optionals: TransponderOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.mode = optionals.mode;
    this.cacheEnabled = optionals.cacheEnabled;
    this.allowCookies = optionals.allowCookies;
    this.gzipEnabled = optionals.gzipEnabled;
    this.priority = optionals.priority;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
    this.nodeId = optionals.nodeId;
  }

  public toObject(): Record<string, any> {
    return {
      id: this.id,
      path: this.path,
      port: this.port,
      status: this.status,
      mode: this.mode,
      cacheEnabled: this.cacheEnabled,
      allowCookies: this.allowCookies,
      gzipEnabled: this.gzipEnabled,
      priority: this.priority,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      portalId: this.portalId,
      nodeId: this.nodeId,
    };
  }

  public static fromObject(object: Record<string, any>): TransponderEntity {
    return new TransponderEntity(
      object.path,
      object.port,
      object.status,
      object.createdBy,
      object.portalId,
      {
        id: object.id,
        mode: object.mode,
        cacheEnabled: object.cacheEnabled,
        allowCookies: object.allowCookies,
        gzipEnabled: object.gzipEnabled,
        priority: object.priority,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
        nodeId: object.nodeId,
      },
    );
  }
}

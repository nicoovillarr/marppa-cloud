import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { PortalType } from '../enum/portal-type.enum';
import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';

interface PortalOptionalProps {
  id?: string;
  description?: string;
  lastSyncAt?: Date;
  lastPublicIP?: string;
  enableCompression?: boolean;
  corsEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  zoneId?: string | null;
}

export class PortalEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly description?: string;
  public readonly lastSyncAt?: Date;
  public readonly lastPublicIP?: string;
  public readonly enableCompression?: boolean;
  public readonly corsEnabled?: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;
  public readonly zoneId?: string | null;

  constructor(
    public readonly name: string,
    public readonly address: string,
    public readonly type: PortalType,
    public readonly apiKey: string,
    public readonly status: ResourceStatus,
    public readonly createdBy: string,
    public readonly ownerId: string,
    optionals: PortalOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.description = optionals.description;
    this.lastSyncAt = optionals.lastSyncAt;
    this.lastPublicIP = optionals.lastPublicIP;
    this.enableCompression = optionals.enableCompression;
    this.corsEnabled = optionals.corsEnabled;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
    this.zoneId = optionals.zoneId;
  }

  public toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      address: this.address,
      type: this.type,
      apiKey: this.apiKey,
      lastSyncAt: this.lastSyncAt,
      lastPublicIP: this.lastPublicIP,
      status: this.status,
      enableCompression: this.enableCompression,
      corsEnabled: this.corsEnabled,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      zoneId: this.zoneId,
      ownerId: this.ownerId,
    };
  }

  public static fromObject(object: Record<string, any>): PortalEntity {
    return new PortalEntity(
      object.name,
      object.address,
      object.type,
      object.apiKey,
      object.status,
      object.createdBy,
      object.ownerId,
      {
        id: object.id,
        description: object.description,
        lastSyncAt: object.lastSyncAt,
        lastPublicIP: object.lastPublicIP,
        enableCompression: object.enableCompression,
        corsEnabled: object.corsEnabled,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
        zoneId: object.zoneId,
      },
    );
  }
}

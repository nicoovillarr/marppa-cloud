import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { PortalType } from "../enum/portal-type.enum";

interface PortalOptionalProps {
  id?: string;
  description?: string;
  lastSyncAt?: Date;
  lastPublicIP?: string;
  listenHttp?: boolean;
  listenHttps?: boolean;
  sslCertificate?: string;
  sslKey?: string;
  enableCompression?: boolean;
  cacheEnabled?: boolean;
  corsEnabled?: boolean;
  defaultServer?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  zoneId?: string;
}

export class PortalEntity extends PatchableEntity {
  public readonly id?: string;
  public readonly description?: string;
  public readonly lastSyncAt?: Date;
  public readonly lastPublicIP?: string;
  public readonly listenHttp?: boolean;
  public readonly listenHttps?: boolean;
  public readonly sslCertificate?: string;
  public readonly sslKey?: string;
  public readonly enableCompression?: boolean;
  public readonly cacheEnabled?: boolean;
  public readonly corsEnabled?: boolean;
  public readonly defaultServer?: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;
  public readonly zoneId?: string;

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
    this.listenHttp = optionals.listenHttp;
    this.listenHttps = optionals.listenHttps;
    this.sslCertificate = optionals.sslCertificate;
    this.sslKey = optionals.sslKey;
    this.enableCompression = optionals.enableCompression;
    this.cacheEnabled = optionals.cacheEnabled;
    this.corsEnabled = optionals.corsEnabled;
    this.defaultServer = optionals.defaultServer;
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
      listenHttp: this.listenHttp,
      listenHttps: this.listenHttps,
      sslCertificate: this.sslCertificate,
      sslKey: this.sslKey,
      enableCompression: this.enableCompression,
      cacheEnabled: this.cacheEnabled,
      corsEnabled: this.corsEnabled,
      defaultServer: this.defaultServer,
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
        listenHttp: object.listenHttp,
        listenHttps: object.listenHttps,
        sslCertificate: object.sslCertificate,
        sslKey: object.sslKey,
        enableCompression: object.enableCompression,
        cacheEnabled: object.cacheEnabled,
        corsEnabled: object.corsEnabled,
        defaultServer: object.defaultServer,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
        zoneId: object.zoneId,
      },
    );
  }
}
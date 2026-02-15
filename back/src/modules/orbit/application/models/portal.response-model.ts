import { Expose } from 'class-transformer';
import { PortalType } from '../../domain/enum/portal-type.enum';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export class PortalResponseModel {
  @Expose()
  public readonly id: string;

  @Expose()
  public readonly name: string;

  @Expose()
  public readonly description: string;

  @Expose()
  public readonly address: string;

  @Expose()
  public readonly type: PortalType;

  @Expose()
  public readonly apiKey: string;

  @Expose()
  public readonly lastSyncAt: Date;

  @Expose()
  public readonly lastPublicIP: string;

  @Expose()
  public readonly status: ResourceStatus;

  @Expose()
  public readonly listenHttp: boolean;

  @Expose()
  public readonly listenHttps: boolean;

  @Expose()
  public readonly sslCertificate: string;

  @Expose()
  public readonly sslKey: string;

  @Expose()
  public readonly enableCompression: boolean;

  @Expose()
  public readonly cacheEnabled: boolean;

  @Expose()
  public readonly corsEnabled: boolean;

  @Expose()
  public readonly defaultServer: boolean;

  @Expose()
  public readonly createdBy: string;

  @Expose()
  public readonly ownerId: string;

  @Expose()
  public readonly createdAt: Date;

  @Expose()
  public readonly updatedAt: Date;

  @Expose()
  public readonly updatedBy: string;

  @Expose()
  public readonly zoneId: string;
}

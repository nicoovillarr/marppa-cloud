import { Expose } from 'class-transformer';
import { PortalType } from '../../domain/enum/portal-type.enum';

export class DnsApiKeyResponseModel {
  @Expose()
  public readonly id: number;

  @Expose()
  public readonly name: string;

  @Expose()
  public readonly description: string | null;

  @Expose()
  public readonly type: PortalType;

  @Expose()
  public readonly portalCount: number;

  @Expose()
  public readonly ownerId: string;

  @Expose()
  public readonly createdAt: Date;

  @Expose()
  public readonly createdBy: string;

  @Expose()
  public readonly updatedAt: Date;

  @Expose()
  public readonly updatedBy: string;
}

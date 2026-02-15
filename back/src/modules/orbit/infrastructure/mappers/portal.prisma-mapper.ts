import { Portal } from '@prisma/client';
import { PortalEntity } from '../../domain/entities/portal.entity';
import { PortalType } from '../../domain/enum/portal-type.enum';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export class PortalPrismaMapper {
  public static toEntity(raw: Portal): PortalEntity {
    return new PortalEntity(
      raw.name,
      raw.address,
      PortalType[raw.type as string],
      raw.apiKey,
      ResourceStatus[raw.status as string],
      raw.createdBy,
      raw.ownerId,
      {
        id: raw.id,
        description: raw.description ?? undefined,
        lastSyncAt: raw.lastSyncAt ?? undefined,
        lastPublicIP: raw.lastPublicIP ?? undefined,
        listenHttp: raw.listenHttp,
        listenHttps: raw.listenHttps,
        sslCertificate: raw.sslCertificate ?? undefined,
        sslKey: raw.sslKey ?? undefined,
        enableCompression: raw.enableCompression,
        cacheEnabled: raw.cacheEnabled,
        corsEnabled: raw.corsEnabled,
        defaultServer: raw.defaultServer,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
        zoneId: raw.zoneId ?? undefined,
      },
    );
  }
}

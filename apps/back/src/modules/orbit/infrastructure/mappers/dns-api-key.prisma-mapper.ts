import { DnsApiKey } from '@prisma/client';
import { DnsApiKeyEntity } from '../../domain/entities/dns-api-key.entity';
import { PortalType } from '../../domain/enum/portal-type.enum';

export class DnsApiKeyPrismaMapper {
  public static toEntity(raw: DnsApiKey): DnsApiKeyEntity {
    return new DnsApiKeyEntity(
      raw.name,
      PortalType[raw.type as string],
      raw.apiKey,
      raw.createdBy,
      raw.ownerId,
      {
        id: raw.id,
        description: raw.description,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
      },
    );
  }
}

import { AtomImage } from '@prisma/client';
import { AtomImageEntity } from '@/nucleus/domain/entities/atom-image.entity';

export class AtomImagePrismaMapper {
  static toEntity(raw: AtomImage): AtomImageEntity {
    return new AtomImageEntity(
      raw.name,
      raw.registry,
      raw.repository,
      raw.defaultTag,
      raw.architecture,
      raw.defaultSizeId,
      {
        id: raw.id,
        description: raw.description ?? undefined,
        digest: raw.digest ?? undefined,
        capabilities: raw.capabilities,
        sysctls: (raw.sysctls as Record<string, string> | null) ?? undefined,
        command: raw.command,
        requiredEnvVars: raw.requiredEnvVars,
        ownerId: raw.ownerId ?? undefined,
      },
    );
  }
}

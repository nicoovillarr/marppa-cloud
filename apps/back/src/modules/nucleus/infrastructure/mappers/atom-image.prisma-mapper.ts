import { AtomImageEntity } from '@/nucleus/domain/entities/atom-image.entity';
import { AtomImage } from '@prisma/client';

export class AtomImagePrismaMapper {
  static toEntity(raw: AtomImage): AtomImageEntity {
    return new AtomImageEntity(
      raw.name,
      raw.registry,
      raw.repository,
      raw.tag,
      raw.architecture,
      {
        id: raw.id,
        description: raw.description ?? undefined,
        digest: raw.digest ?? undefined,
        capabilities: raw.capabilities,
        requiredEnvVars: raw.requiredEnvVars,
      },
    );
  }
}

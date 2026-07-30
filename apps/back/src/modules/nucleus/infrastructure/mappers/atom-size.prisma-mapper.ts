import { AtomSizeEntity } from '@/nucleus/domain/entities/atom-size.entity';
import { AtomSize } from '@prisma/client';

export class AtomSizePrismaMapper {
  static toEntity(raw: AtomSize): AtomSizeEntity {
    return new AtomSizeEntity(raw.name, raw.cpuCores, raw.ramMB, {
      id: raw.id,
      version: raw.version,
      pricePerHourCents: raw.pricePerHourCents,
      deprecatedAt: raw.deprecatedAt,
    });
  }
}

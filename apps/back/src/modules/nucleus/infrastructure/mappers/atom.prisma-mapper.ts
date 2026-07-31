import { AtomEntity } from '@/nucleus/domain/entities/atom.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { Atom } from '@prisma/client';

export class AtomPrismaMapper {
  static toEntity(raw: Atom): AtomEntity {
    return new AtomEntity(
      raw.name,
      ResourceStatus[raw.status as string],
      raw.createdBy,
      raw.imageId,
      raw.tag,
      raw.ownerId,
      raw.sizeId,
      raw.cpuCores,
      raw.ramMB,
      {
        id: raw.id,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt ?? undefined,
        updatedBy: raw.updatedBy ?? undefined,
      },
    );
  }
}

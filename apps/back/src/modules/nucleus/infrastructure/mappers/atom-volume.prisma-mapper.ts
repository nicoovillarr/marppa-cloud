import { AtomVolumeEntity } from '@/nucleus/domain/entities/atom-volume.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { AtomVolume } from '@prisma/client';

export class AtomVolumePrismaMapper {
  static toEntity(raw: AtomVolume): AtomVolumeEntity {
    return new AtomVolumeEntity(
      raw.name,
      ResourceStatus[raw.status as string],
      raw.sizeGiB,
      raw.ownerId,
      raw.createdBy,
      {
        id: raw.id,
        mountPoint: raw.mountPoint,
        hostPath: raw.hostPath ?? undefined,
        atomId: raw.atomId ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
      },
    );
  }
}

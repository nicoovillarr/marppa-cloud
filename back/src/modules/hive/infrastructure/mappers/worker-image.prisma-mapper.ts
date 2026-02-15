import { WorkerImageEntity } from '@/hive/domain/entities/worker-image.entity';
import { WorkerImage } from '@prisma/client';

export class WorkerImagePrismaMapper {
  static toEntity(raw: WorkerImage): WorkerImageEntity {
    return new WorkerImageEntity(
      raw.name,
      raw.osType,
      raw.osFamily,
      raw.imageUrl,
      raw.architecture,
      raw.virtualizationType,
      {
        id: raw.id,
        description: raw.description ?? undefined,
        osVersion: raw.osVersion ?? undefined,
        workerStorageTypeId: raw.workerStorageTypeId ?? undefined,
      },
    );
  }
}

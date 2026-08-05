import { WorkerDiskEntity } from '@/hive/domain/entities/worker-disk.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { WorkerDisk } from '@prisma/client';

export class WorkerDiskPrismaMapper {
  static toEntity(raw: WorkerDisk): WorkerDiskEntity {
    return new WorkerDiskEntity(
      raw.name,
      ResourceStatus[raw.status as string],
      raw.sizeGiB,
      raw.ownerId,
      raw.storageTypeId,
      raw.createdBy,
      {
        id: raw.id,
        hostPath: raw.hostPath ?? undefined,
        mountPoint: raw.mountPoint ?? undefined,
        deviceTarget: raw.deviceTarget ?? undefined,
        isBoot: raw.isBoot,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
        workerId: raw.workerId ?? undefined,
      },
    );
  }
}

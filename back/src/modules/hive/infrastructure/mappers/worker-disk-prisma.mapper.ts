import { WorkerDiskEntity } from "@/hive/domain/entities/worker-disk.entity";
import { WorkerDisk } from "@prisma/client";

export class WorkerDiskPrismaMapper {
  static toEntity(raw: WorkerDisk): WorkerDiskEntity {
    return new WorkerDiskEntity(
      raw.name,
      raw.sizeGiB,
      raw.hostPath,
      raw.ownerId,
      raw.storageTypeId,
      raw.createdBy,
      {
        id: raw.id,
        mountPoint: raw.mountPoint ?? undefined,
        isBoot: raw.isBoot,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
        workerId: raw.workerId ?? undefined,
      }
    );
  }
}
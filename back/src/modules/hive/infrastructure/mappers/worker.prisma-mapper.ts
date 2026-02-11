import { WorkerEntity } from "@/hive/domain/entities/worker.entity";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { Prisma, Worker } from "@prisma/client";

export class WorkerPrismaMapper {
  static toEntity(raw: Worker): WorkerEntity {
    return new WorkerEntity(
      raw.name,
      ResourceStatus[raw.status as string],
      raw.macAddress,
      raw.createdBy,
      raw.imageId,
      raw.flavorId,
      raw.ownerId,
      {
        id: raw.id,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt ?? undefined,
        updatedBy: raw.updatedBy ?? undefined,
      }
    );
  }
}
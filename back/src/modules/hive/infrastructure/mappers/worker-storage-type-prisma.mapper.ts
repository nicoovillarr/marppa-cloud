import { WorkerStorageTypeEntity } from "@/hive/domain/entities/worker-storage-type.entity";
import { WorkerStorageType } from "@prisma/client";

export class WorkerStorageTypePrismaMapper {
  static toEntity(raw: WorkerStorageType): WorkerStorageTypeEntity {
    return new WorkerStorageTypeEntity(
      raw.name,
      raw.description,
      raw.persistent,
      raw.attachable,
      raw.shared,
      {
        id: raw.id,
      }
    )
  }
}
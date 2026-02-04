import { WorkerMmiFamilyEntity } from "@/hive/domain/entities/worker-mmi-family.entity";
import { WorkerMMIFamily } from "@prisma/client";

export class WorkerMmiFamilyPrismaMapper {
  static toEntity(raw: WorkerMMIFamily): WorkerMmiFamilyEntity {
    return new WorkerMmiFamilyEntity(
      raw.name,
      {
        id: raw.id,
        description: raw.description ?? undefined,
      }
    )
  }
}
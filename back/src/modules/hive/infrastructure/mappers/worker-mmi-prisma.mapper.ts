import { WorkerMmiEntity } from "@/hive/domain/entities/worker-mmi.entity";
import { WorkerMMI } from "@prisma/client";

export class WorkerMmiPrismaMapper {
  static toEntity(raw: WorkerMMI): WorkerMmiEntity {
    return new WorkerMmiEntity(
      raw.type,
      raw.cpuCores,
      raw.ramMB,
      raw.diskGB,
      raw.familyId,
      {
        id: raw.id,
      })
  }
}
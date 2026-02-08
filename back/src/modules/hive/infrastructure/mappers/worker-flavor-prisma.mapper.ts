import { WorkerFlavor } from "@prisma/client";
import { WorkerFlavorEntity } from "../../domain/entities/worker-flavor.entity";

export class WorkerFlavorPrismaMapper {
  static toEntity(raw: WorkerFlavor): WorkerFlavorEntity {
    return new WorkerFlavorEntity(
      raw.name,
      raw.cpuCores,
      raw.ramMB,
      raw.diskGB,
      raw.familyId,
      {
        id: raw.id,
      }
    );
  }
}
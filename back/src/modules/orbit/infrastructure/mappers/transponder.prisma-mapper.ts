import { Transponder } from "@prisma/client";
import { TransponderEntity } from "../../domain/entities/transponder.entity";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";

export class TransponderPrismaMapper {
  public static toEntity(raw: Transponder): TransponderEntity {
    return new TransponderEntity(
      raw.path,
      raw.port,
      ResourceStatus[raw.status as string],
      raw.createdBy,
      raw.portalId,
      {
        id: raw.id,
        mode: raw.mode,
        cacheEnabled: raw.cacheEnabled,
        allowCookies: raw.allowCookies,
        gzipEnabled: raw.gzipEnabled,
        priority: raw.priority,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
        nodeId: raw.nodeId ?? undefined,
      }
    )
  }
}
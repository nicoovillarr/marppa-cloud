import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { ZoneEntity } from "../../domain/entities/zone.entity";
import { Zone } from "@prisma/client";

export class ZonePrismaMapper {
  static toEntity(model: Zone): ZoneEntity {
    return new ZoneEntity(
      model.name,
      ResourceStatus[model.status as string],
      model.cidr,
      model.gateway,
      model.createdBy,
      model.ownerId,
      {
        id: model.id,
        description: model.description ?? undefined,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        updatedBy: model.updatedBy,
      }
    );
  }
}
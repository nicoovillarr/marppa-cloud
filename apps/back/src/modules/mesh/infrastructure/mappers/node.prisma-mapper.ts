import { Node } from '@prisma/client';
import { NodeEntity } from '../../domain/entities/node.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export class NodePrismaMapper {
  static toEntity(raw: Node): NodeEntity {
    return new NodeEntity(
      raw.ipAddress,
      ResourceStatus[raw.status as string],
      raw.zoneId,
      raw.createdBy,
      {
        id: raw.id,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
        workerId: raw.workerId ?? undefined,
        atomId: raw.atomId ?? undefined,
      },
    );
  }
}

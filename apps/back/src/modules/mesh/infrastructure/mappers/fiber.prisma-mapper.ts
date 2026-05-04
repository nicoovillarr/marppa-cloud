import { Fiber } from '@prisma/client';
import { FiberEntity } from '../../domain/entities/fiber.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

export class FiberPrismaMapper {
  static toEntity(raw: Fiber): FiberEntity {
    return new FiberEntity(
      raw.protocol,
      raw.targetPort,
      ResourceStatus[raw.status as string],
      raw.nodeId,
      raw.createdBy,
      {
        id: raw.id,
        hostPort: raw.hostPort ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        updatedBy: raw.updatedBy ?? undefined,
      },
    );
  }
}

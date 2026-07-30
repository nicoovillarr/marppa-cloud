import { WorkerFamilyEntity } from '@/hive/domain/entities/worker-family.entity';
import { WorkerFamily } from '@prisma/client';

export class WorkerFamilyPrismaMapper {
  static toEntity(raw: WorkerFamily): WorkerFamilyEntity {
    return new WorkerFamilyEntity(raw.name, raw.architecture, {
      id: raw.id,
      description: raw.description ?? undefined,
      ownerId: raw.ownerId,
      deprecatedAt: raw.deprecatedAt,
    });
  }
}

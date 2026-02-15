import { WorkerFamilyEntity } from '@/hive/domain/entities/worker-family.entity';
import { WorkerFamily } from '@prisma/client';

export class WorkerFamilyPrismaMapper {
  static toEntity(raw: WorkerFamily): WorkerFamilyEntity {
    return new WorkerFamilyEntity(raw.name, {
      id: raw.id,
      description: raw.description ?? undefined,
    });
  }
}

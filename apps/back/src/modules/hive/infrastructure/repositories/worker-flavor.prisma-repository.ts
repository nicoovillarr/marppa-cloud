import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerFlavorPrismaMapper } from '../mappers/worker-flavor.prisma-mapper';
import { WorkerFlavorEntity } from '@/hive/domain/entities/worker-flavor.entity';
import { Injectable } from '@nestjs/common';
import { WorkerFlavorRepository } from '@/hive/domain/repositories/worker-flavor.repository';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { WorkerFlavorWithFamilyModel } from '@/hive/domain/models/worker-flavor-with-family.model';
import { WorkerFamilyPrismaMapper } from '../mappers/worker-family.prisma-mapper';

@Injectable()
export class WorkerFlavorPrismaRepository implements WorkerFlavorRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: number): Promise<WorkerFlavorEntity | null> {
    const workerFlavor = await this.prisma.workerFlavor.findUnique({
      where: {
        id,
      },
    });

    if (!workerFlavor) {
      return null;
    }

    return WorkerFlavorPrismaMapper.toEntity(workerFlavor);
  }

  async findByIdWithFamily(
    id: number,
  ): Promise<WorkerFlavorWithFamilyModel | null> {
    const workerFlavor = await this.prisma.workerFlavor.findUnique({
      where: {
        id,
      },
      include: {
        family: true,
      },
    });

    if (!workerFlavor) {
      return null;
    }

    return new WorkerFlavorWithFamilyModel(
      WorkerFlavorPrismaMapper.toEntity(workerFlavor),
      WorkerFamilyPrismaMapper.toEntity(workerFlavor.family),
    );
  }

  async findAll(includeDeprecated: boolean): Promise<WorkerFlavorEntity[]> {
    const workerFlavors = await this.prisma.workerFlavor.findMany({
      where: includeDeprecated ? {} : { deprecatedAt: null },
    });

    return workerFlavors.map(WorkerFlavorPrismaMapper.toEntity);
  }

  async findMaxVersion(familyId: number, name: string): Promise<number> {
    const { _max } = await this.prisma.workerFlavor.aggregate({
      where: { familyId, name },
      _max: { version: true },
    });

    return _max.version ?? 0;
  }

  async create(entity: WorkerFlavorEntity): Promise<WorkerFlavorEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFlavor = await this.prisma.workerFlavor.create({
      data: sanitized,
    });

    return WorkerFlavorPrismaMapper.toEntity(workerFlavor);
  }

  async restore(id: number): Promise<void> {
    await this.prisma.workerFlavor.update({
      where: { id },
      data: { deprecatedAt: null },
    });
  }

  async deprecate(id: number, deprecatedAt: Date): Promise<void> {
    await this.prisma.workerFlavor.update({
      where: {
        id,
      },
      data: {
        deprecatedAt,
      },
    });
  }
}

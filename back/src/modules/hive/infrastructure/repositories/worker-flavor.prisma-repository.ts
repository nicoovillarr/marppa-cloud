import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerFlavorPrismaMapper } from '../mappers/worker-flavor.prisma-mapper';
import { WorkerFlavorEntity } from '@/hive/domain/entities/worker-flavor.entity';
import { Injectable } from '@nestjs/common';
import { WorkerFlavorRepository } from '@/hive/domain/repositories/worker-flavor.repository';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class WorkerFlavorPrismaRepository implements WorkerFlavorRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(entity: WorkerFlavorEntity): Promise<WorkerFlavorEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFlavor = await this.prisma.workerFlavor.create({
      data: sanitized,
    });

    return WorkerFlavorPrismaMapper.toEntity(workerFlavor);
  }

  async update(entity: WorkerFlavorEntity): Promise<WorkerFlavorEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFlavor = await this.prisma.workerFlavor.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerFlavorPrismaMapper.toEntity(workerFlavor);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workerFlavor.delete({
      where: {
        id,
      },
    });
  }
}

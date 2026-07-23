import { WorkerFamilyEntity } from '@/hive/domain/entities/worker-family.entity';
import { WorkerFamilyRepository } from '@/hive/domain/repositories/worker-family.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { WorkerFamilyPrismaMapper } from '../mappers/worker-family.prisma-mapper';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { WorkerFamilyWithFlavorsModel } from '@/hive/domain/models/worker-family-with-flavors.model';
import { WorkerFamilyWithFlavorsPrismaMapper } from '../mappers/worker-family-with-flavors.prisma-mapper';

@Injectable()
export class WorkerFamilyPrismaRepository implements WorkerFamilyRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<WorkerFamilyWithFlavorsModel[]> {
    const workerFamilies = await this.prisma.workerFamily.findMany({
      include: {
        flavors: true,
      },
    });

    return workerFamilies.map(WorkerFamilyWithFlavorsPrismaMapper.toDomain);
  }

  async findById(id: number): Promise<WorkerFamilyEntity | null> {
    const workerFamily = await this.prisma.workerFamily.findUnique({
      where: {
        id,
      },
    });

    if (!workerFamily) {
      return null;
    }

    return WorkerFamilyPrismaMapper.toEntity(workerFamily);
  }

  async create(entity: WorkerFamilyEntity): Promise<WorkerFamilyEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFamily = await this.prisma.workerFamily.create({
      data: sanitized,
    });

    return WorkerFamilyPrismaMapper.toEntity(workerFamily);
  }

  async update(entity: WorkerFamilyEntity): Promise<WorkerFamilyEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFamily = await this.prisma.workerFamily.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerFamilyPrismaMapper.toEntity(workerFamily);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workerFamily.delete({
      where: {
        id,
      },
    });
  }
}

import { WorkerStorageTypeEntity } from '@/hive/domain/entities/worker-storage-type.entity';
import { WorkerStorageTypeRepository } from '@/hive/domain/repositories/worker-storage-type.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerStorageTypePrismaMapper } from '../mappers/worker-storage-type.prisma-mapper';
import { Injectable } from '@nestjs/common';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class WorkerStorageTypePrismaRepository implements WorkerStorageTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<WorkerStorageTypeEntity | null> {
    const workerStorageType = await this.prisma.workerStorageType.findUnique({
      where: {
        id,
      },
    });

    if (!workerStorageType) {
      return null;
    }

    return WorkerStorageTypePrismaMapper.toEntity(workerStorageType);
  }

  async create(
    entity: WorkerStorageTypeEntity,
  ): Promise<WorkerStorageTypeEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerStorageType = await this.prisma.workerStorageType.create({
      data: sanitized,
    });

    return WorkerStorageTypePrismaMapper.toEntity(workerStorageType);
  }

  async update(
    entity: WorkerStorageTypeEntity,
  ): Promise<WorkerStorageTypeEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerStorageType = await this.prisma.workerStorageType.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerStorageTypePrismaMapper.toEntity(workerStorageType);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workerStorageType.delete({
      where: {
        id,
      },
    });
  }
}

import { WorkerEntity } from '@/hive/domain/entities/worker.entity';
import { WorkerWithRelationsModel } from '@/hive/domain/models/worker-with-relations.model';
import { WorkerRepository } from '@/hive/domain/repositories/worker.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { WorkerPrismaMapper } from '../mappers/worker.prisma-mapper';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { WorkerWithRelationsPrismaMapper } from '../mappers/worker-with-relations.prisma-mapper';
import { WorkerResourceUsageModel } from '@/hive/domain/models/worker-resource-usage.model';
import { Prisma, ResourceStatus } from '@prisma/client';

const RUNNING_STATUSES = [
  ResourceStatus.QUEUED,
  ResourceStatus.PROVISIONING,
  ResourceStatus.UPDATING,
  ResourceStatus.ACTIVE,
  ResourceStatus.TERMINATING,
];

@Injectable()
export class WorkerPrismaRepository implements WorkerRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<WorkerEntity | null> {
    const worker: any = await this.prisma.worker.findUnique({
      where: {
        id,
      },
    });

    if (!worker) {
      return null;
    }

    return WorkerPrismaMapper.toEntity(worker);
  }

  async sumProvisionedResources(): Promise<WorkerResourceUsageModel> {
    return this.sumResources({ status: { not: ResourceStatus.DELETED } });
  }

  async sumRunningResources(
    excludedWorkerId?: string,
  ): Promise<WorkerResourceUsageModel> {
    return this.sumResources({
      status: { in: RUNNING_STATUSES },
      ...(excludedWorkerId ? { id: { not: excludedWorkerId } } : {}),
    });
  }

  private async sumResources(
    where: Prisma.WorkerWhereInput,
  ): Promise<WorkerResourceUsageModel> {
    const { _sum } = await this.prisma.worker.aggregate({
      where,
      _sum: { cpuCores: true, ramMB: true, diskGB: true },
    });

    return new WorkerResourceUsageModel(
      _sum.cpuCores ?? 0,
      _sum.ramMB ?? 0,
      _sum.diskGB ?? 0,
    );
  }

  async findByIdWithRelations(id: string): Promise<WorkerWithRelationsModel | null> {
    const worker: any = await this.prisma.worker.findUnique({
      where: {
        id,
      },
      include: {
        flavor: true,
        node: true,
      },
    });

    if (!worker) {
      return null;
    }

    return WorkerWithRelationsPrismaMapper.toDomain(worker);
  }

  async findByOwnerId(ownerId: string): Promise<WorkerWithRelationsModel[]> {
    const workers = await this.prisma.worker.findMany({
      where: {
        ownerId,
      },
      include: {
        flavor: true,
        node: true,
      },
    });

    return workers.map(WorkerWithRelationsPrismaMapper.toDomain);
  }

  async create(entity: WorkerEntity): Promise<WorkerEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const worker = await this.prisma.worker.create({
      data: sanitized,
    });

    return WorkerPrismaMapper.toEntity(worker);
  }

  async update(entity: WorkerEntity): Promise<WorkerEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const worker = await this.prisma.worker.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerPrismaMapper.toEntity(worker);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.worker.delete({
      where: {
        id,
      },
    });
  }
}

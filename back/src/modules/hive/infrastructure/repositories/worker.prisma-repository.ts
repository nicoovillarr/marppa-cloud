import { WorkerEntity } from "@/hive/domain/entities/worker.entity";
import { WorkerRepository } from "@/hive/domain/repositories/worker.repository";
import { PrismaService } from "@/shared/infrastructure/services/prisma.service";
import { Injectable } from "@nestjs/common";
import { WorkerPrismaMapper } from "../mappers/worker.prisma-mapper";
import { PrismaMapper } from "@/shared/infrastructure/mappers/prisma.mapper";

@Injectable()
export class WorkerPrismaRepository implements WorkerRepository {
  constructor(
    private readonly prisma: PrismaService
  ) { }

  async findById(id: string): Promise<WorkerEntity | null> {
    const worker = await this.prisma.worker.findUnique({
      where: {
        id,
      },
    });

    if (!worker) {
      return null;
    }

    return WorkerPrismaMapper.toEntity(worker);
  }

  async findByOwnerId(ownerId: string): Promise<WorkerEntity[]> {
    const workers = await this.prisma.worker.findMany({
      where: {
        ownerId,
      },
    });

    return workers.map((worker) => WorkerPrismaMapper.toEntity(worker));
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
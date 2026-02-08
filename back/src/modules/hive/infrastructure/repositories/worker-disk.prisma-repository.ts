import { WorkerDiskEntity } from "@/hive/domain/entities/worker-disk.entity";
import { WorkerDiskRepository } from "@/hive/domain/repositories/worker-disk.repository";
import { PrismaService } from "@/shared/infrastructure/services/prisma.service";
import { WorkerDiskPrismaMapper } from "../mappers/worker-disk.prisma-mapper";
import { Injectable } from "@nestjs/common";
import { PrismaMapper } from "@/shared/infrastructure/mappers/prisma.mapper";

@Injectable()
export class WorkerDiskPrismaRepository implements WorkerDiskRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async findById(id: number): Promise<WorkerDiskEntity | null> {
    const workerDisk = await this.prisma.workerDisk.findUnique({
      where: {
        id,
      },
    });

    if (!workerDisk) {
      return null;
    }

    return WorkerDiskPrismaMapper.toEntity(workerDisk);
  }

  async findByOwnerId(ownerId: string): Promise<WorkerDiskEntity[]> {
    const workerDisks = await this.prisma.workerDisk.findMany({
      where: {
        ownerId,
      },
    });

    return workerDisks.map((workerDisk) => WorkerDiskPrismaMapper.toEntity(workerDisk));
  }

  async create(entity: WorkerDiskEntity): Promise<WorkerDiskEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerDisk = await this.prisma.workerDisk.create({
      data: sanitized,
    });

    return WorkerDiskPrismaMapper.toEntity(workerDisk);
  }

  async update(entity: WorkerDiskEntity): Promise<WorkerDiskEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerDisk = await this.prisma.workerDisk.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerDiskPrismaMapper.toEntity(workerDisk);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workerDisk.delete({
      where: {
        id,
      },
    });
  }

}
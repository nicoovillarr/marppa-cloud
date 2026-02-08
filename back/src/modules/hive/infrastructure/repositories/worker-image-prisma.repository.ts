import { WorkerImageEntity } from "@/hive/domain/entities/worker-image.entity";
import { WorkerImageRepository } from "@/hive/domain/repositories/worker-image.repository";
import { PrismaService } from "@/shared/infrastructure/services/prisma.service";
import { WorkerImagePrismaMapper } from "../mappers/worker-image-prisma.mapper";
import { Injectable } from "@nestjs/common";
import { PrismaMapper } from "@/shared/infrastructure/mappers/prisma.mapper";

@Injectable()
export class WorkerImagePrismaRepository implements WorkerImageRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async findById(id: number): Promise<WorkerImageEntity | null> {
    const workerImage = await this.prisma.workerImage.findUnique({
      where: {
        id,
      },
    });

    if (!workerImage) {
      return null;
    }

    return WorkerImagePrismaMapper.toEntity(workerImage);
  }

  async create(entity: WorkerImageEntity): Promise<WorkerImageEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerImage = await this.prisma.workerImage.create({
      data: sanitized,
    });

    return WorkerImagePrismaMapper.toEntity(workerImage);
  }

  async update(entity: WorkerImageEntity): Promise<WorkerImageEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerImage = await this.prisma.workerImage.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerImagePrismaMapper.toEntity(workerImage);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workerImage.delete({
      where: {
        id,
      },
    });
  }

}
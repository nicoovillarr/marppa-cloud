import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { FiberRepository } from '../../domain/repositories/fiber.repository';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { FiberEntity } from '../../domain/entities/fiber.entity';
import { FiberPrismaMapper } from '../mappers/fiber.prisma-mapper';

@Injectable()
export class FiberPrismaRepository implements FiberRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findById(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<FiberEntity | null> {
    const model = await this.prisma.fiber.findFirst({
      where: {
        id: fiberId,
        node: {
          id: nodeId,
          zone: {
            id: zoneId,
          },
        },
      },
    });

    if (model == null) {
      return null;
    }

    return FiberPrismaMapper.toEntity(model);
  }

  public async findByNodeId(
    zoneId: string,
    nodeId: string,
  ): Promise<FiberEntity[]> {
    const models = await this.prisma.fiber.findMany({
      where: {
        node: {
          id: nodeId,
          zone: {
            id: zoneId,
          },
        },
      },
    });

    return models.map(FiberPrismaMapper.toEntity);
  }

  public async create(fiber: FiberEntity): Promise<FiberEntity> {
    const sanitized = PrismaMapper.toCreate(fiber);

    const model = await this.prisma.fiber.create({
      data: sanitized,
    });

    return FiberPrismaMapper.toEntity(model);
  }

  public async delete(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<void> {
    await this.prisma.fiber.deleteMany({
      where: {
        id: fiberId,
        node: {
          id: nodeId,
          zone: {
            id: zoneId,
          },
        },
      },
    });
  }
}

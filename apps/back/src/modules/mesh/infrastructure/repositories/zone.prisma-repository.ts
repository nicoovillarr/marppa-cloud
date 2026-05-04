import { Injectable } from '@nestjs/common';
import { ZoneRepository } from '../../domain/repositories/zone.repository';
import { ZoneEntity } from '../../domain/entities/zone.entity';
import { ZonePrismaMapper } from '../mappers/zone.prisma-mapper';
import { ZoneWithNodesModel } from '../../domain/models/zone-with-nodes.model';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { NodePrismaMapper } from '../mappers/node.prisma-mapper';
import { ZoneWithNodesAndFibersModel } from '@/mesh/domain/models/zone-with-nodes-and-fibers.model';
import { NodeWithFibersModel } from '@/mesh/domain/models/node-with-fibers.model';
import { FiberPrismaMapper } from '../mappers/fiber.prisma-mapper';

@Injectable()
export class ZonePrismaRepository implements ZoneRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<ZoneEntity | null> {
    const model = await this.prisma.zone.findUnique({
      where: { id },
    });

    if (model == null) {
      return null;
    }

    return ZonePrismaMapper.toEntity(model);
  }

  async findByIdWithNodes(id: string): Promise<ZoneWithNodesModel | null> {
    const model = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        nodes: true,
      },
    });

    if (model == null) {
      return null;
    }

    return new ZoneWithNodesModel(
      ZonePrismaMapper.toEntity(model),
      model.nodes.map(NodePrismaMapper.toEntity),
    );
  }

  async findByIdFull(id: string): Promise<ZoneWithNodesAndFibersModel | null> {
    const model = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        nodes: {
          include: {
            fibers: true,
          },
        },
      },
    });

    if (model == null) {
      return null;
    }

    return new ZoneWithNodesAndFibersModel(
      ZonePrismaMapper.toEntity(model),
      model.nodes.map(node => new NodeWithFibersModel(
        NodePrismaMapper.toEntity(node),
        node.fibers.map(FiberPrismaMapper.toEntity)
      )),
    );
  }

  async findByOwnerId(ownerId: string): Promise<ZoneWithNodesAndFibersModel[]> {
    const models = await this.prisma.zone.findMany({
      where: { ownerId },
      include: {
        nodes: {
          include: {
            fibers: true,
          },
        },
      },
    });

    return models.map(model => new ZoneWithNodesAndFibersModel(
      ZonePrismaMapper.toEntity(model),
      model.nodes.map(node => new NodeWithFibersModel(
        NodePrismaMapper.toEntity(node),
        node.fibers.map(FiberPrismaMapper.toEntity)
      )),
    ));
  }

  async findLastZone(): Promise<ZoneWithNodesModel | null> {
    const model = await this.prisma.zone.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        nodes: true,
      },
    });

    if (model == null) {
      return null;
    }

    return new ZoneWithNodesModel(
      ZonePrismaMapper.toEntity(model),
      model.nodes.map(NodePrismaMapper.toEntity),
    );
  }

  async create(entity: ZoneEntity): Promise<ZoneEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const model = await this.prisma.zone.create({
      data: sanitized,
    });

    return ZonePrismaMapper.toEntity(model);
  }

  async update(entity: ZoneEntity): Promise<ZoneEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const model = await this.prisma.zone.update({
      where: { id: entity.id },
      data: {
        name: sanitized.name,
        description: sanitized.description,
        updatedBy: sanitized.updatedBy,
      },
    });
    return ZonePrismaMapper.toEntity(model);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.zone.delete({
      where: { id },
    });
  }
}

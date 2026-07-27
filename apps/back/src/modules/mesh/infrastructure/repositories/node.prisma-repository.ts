import { Injectable } from '@nestjs/common';
import { NodeRepository } from '../../domain/repositories/node.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { NodeEntity } from '../../domain/entities/node.entity';
import { NodePrismaMapper } from '../mappers/node.prisma-mapper';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { NodeWithZoneModel } from '../../domain/models/node-with-zone.model';
import { ZonePrismaMapper } from '../mappers/zone.prisma-mapper';

@Injectable()
export class NodePrismaRepository implements NodeRepository {
  constructor(private readonly prisma: PrismaService) { }

  public async findById(
    zoneId: string,
    id: string,
  ): Promise<NodeEntity | null> {
    const model = await this.prisma.node.findFirst({
      where: { zoneId, id },
    });

    if (model == null) {
      return null;
    }

    return NodePrismaMapper.toEntity(model);
  }

  public async findByIdWithZone(id: string): Promise<NodeWithZoneModel | null> {
    const model = await this.prisma.node.findUnique({
      where: { id },
      include: { zone: true },
    });

    if (model == null) {
      return null;
    }

    return new NodeWithZoneModel(
      NodePrismaMapper.toEntity(model),
      ZonePrismaMapper.toEntity(model.zone),
    );
  }

  public async findWorkerOwnerId(workerId: string): Promise<string | null> {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      select: { ownerId: true },
    });

    return worker?.ownerId ?? null;
  }

  public async findAtomOwnerId(atomId: string): Promise<string | null> {
    const atom = await this.prisma.atom.findUnique({
      where: { id: atomId },
      select: { ownerId: true },
    });

    return atom?.ownerId ?? null;
  }

  public async findAtomStatus(atomId: string): Promise<string | null> {
    const atom = await this.prisma.atom.findUnique({
      where: { id: atomId },
      select: { status: true },
    });

    return atom?.status ?? null;
  }

  public async findByZoneId(zoneId: string): Promise<NodeEntity[]> {
    const models = await this.prisma.node.findMany({
      where: { zoneId },
    });

    return models.map(NodePrismaMapper.toEntity);
  }

  public async findByWorkerId(workerId: string): Promise<NodeEntity | null> {
    const model = await this.prisma.node.findUnique({
      where: { workerId },
    });

    if (model == null) {
      return null;
    }

    return NodePrismaMapper.toEntity(model);
  }

  public async findByWorkerIds(workerIds: string[]): Promise<NodeEntity[]> {
    const models = await this.prisma.node.findMany({
      where: { workerId: { in: workerIds } },
    });

    return models.map(NodePrismaMapper.toEntity);
  }

  public async create(node: NodeEntity): Promise<NodeEntity> {
    const sanitized = PrismaMapper.toCreate(node);

    const model = await this.prisma.node.create({
      data: sanitized,
    });

    return NodePrismaMapper.toEntity(model);
  }

  public async update(node: NodeEntity): Promise<NodeEntity> {
    const sanitized = PrismaMapper.toCreate(node);

    const model = await this.prisma.node.update({
      where: { id: node.id },
      data: {
        status: sanitized.status,
        updatedBy: sanitized.updatedBy,
      },
    });

    return NodePrismaMapper.toEntity(model);
  }

  public async delete(zoneId: string, id: string): Promise<void> {
    await this.prisma.node.deleteMany({
      where: { zoneId, id },
    });
  }
}

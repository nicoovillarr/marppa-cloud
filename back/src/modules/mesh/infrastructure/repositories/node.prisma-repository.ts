import { Injectable } from "@nestjs/common";
import { NodeRepository } from "../../domain/repositories/node.repository";
import { PrismaService } from "@/shared/infrastructure/services/prisma.service";
import { NodeEntity } from "../../domain/entities/node.entity";
import { NodePrismaMapper } from "../mappers/node.prisma-mapper";
import { PrismaMapper } from "@/shared/infrastructure/mappers/prisma.mapper";

@Injectable()
export class NodePrismaRepository implements NodeRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  public async findById(zoneId: string, id: string): Promise<NodeEntity | null> {
    const model = await this.prisma.node.findUnique({
      where: { zoneId, id },
    });

    if (model == null) {
      return null;
    }

    return NodePrismaMapper.toEntity(model);
  }

  public async findByZoneId(zoneId: string): Promise<NodeEntity[]> {
    const models = await this.prisma.node.findMany({
      where: { zoneId },
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

  public async delete(zoneId: string, id: string): Promise<void> {
    await this.prisma.node.delete({
      where: { zoneId, id },
    });
  }
}
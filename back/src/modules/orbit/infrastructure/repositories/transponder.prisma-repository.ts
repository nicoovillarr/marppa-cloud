import { TransponderRepository } from "../../domain/repositories/transponder.repository";
import { PrismaService } from "@/shared/infrastructure/services/prisma.service";
import { TransponderPrismaMapper } from "../mappers/transponder.prisma-mapper";
import { TransponderEntity } from "../../domain/entities/transponder.entity";
import { PrismaMapper } from "@/shared/infrastructure/mappers/prisma.mapper";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TransponderPrismaRepository implements TransponderRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  public async findById(portalId: string, transponderId: string): Promise<TransponderEntity | null> {
    const transponder = await this.prisma.transponder.findUnique({
      where: {
        id: transponderId,
        portalId,
      },
    });

    if (transponder == null) {
      return null;
    }

    return TransponderPrismaMapper.toEntity(transponder);
  }

  public async findByPortalId(portalId: string): Promise<TransponderEntity[]> {
    const list = await this.prisma.transponder.findMany({
      where: {
        portalId,
      },
    });

    return list.map(TransponderPrismaMapper.toEntity);
  }

  public async create(data: TransponderEntity): Promise<TransponderEntity> {
    const sanitize = PrismaMapper.toCreate(data);

    const transponder = await this.prisma.transponder.create({
      data: sanitize,
    });

    return TransponderPrismaMapper.toEntity(transponder);
  }

  public async update(data: TransponderEntity): Promise<TransponderEntity> {
    const sanitize = PrismaMapper.toCreate(data);

    const transponder = await this.prisma.transponder.update({
      where: { id: data.id },
      data: sanitize,
    });

    return TransponderPrismaMapper.toEntity(transponder);
  }

  public async delete(portalId: string, transponderId: string): Promise<void> {
    await this.prisma.transponder.delete({
      where: { id: transponderId, portalId },
    });
  }
}
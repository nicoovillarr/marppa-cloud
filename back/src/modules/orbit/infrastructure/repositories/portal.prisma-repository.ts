import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { PortalPrismaMapper } from '../mappers/portal.prisma-mapper';
import { PortalEntity } from '../../domain/entities/portal.entity';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { PortalRepository } from '../../domain/repositories/portal.repository';

@Injectable()
export class PortalPrismaRepository implements PortalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(portalId: string): Promise<PortalEntity | null> {
    const portal = await this.prisma.portal.findUnique({
      where: { id: portalId },
    });

    if (portal == null) {
      return null;
    }

    return PortalPrismaMapper.toEntity(portal);
  }

  async findByOwnerId(ownerId: string): Promise<PortalEntity[]> {
    const list = await this.prisma.portal.findMany({
      where: {
        ownerId,
      },
    });

    return list.map(PortalPrismaMapper.toEntity);
  }

  async create(data: PortalEntity): Promise<PortalEntity> {
    const sanitize = PrismaMapper.toCreate(data);

    const portal = await this.prisma.portal.create({
      data: sanitize,
    });

    return PortalPrismaMapper.toEntity(portal);
  }

  async update(data: PortalEntity): Promise<PortalEntity> {
    const sanitize = PrismaMapper.toCreate(data);

    const portal = await this.prisma.portal.update({
      where: { id: data.id },
      data: sanitize,
    });

    return PortalPrismaMapper.toEntity(portal);
  }

  async delete(portalId: string): Promise<void> {
    await this.prisma.portal.delete({
      where: { id: portalId },
    });
  }
}

import { AtomVolumeEntity } from '@/nucleus/domain/entities/atom-volume.entity';
import { AtomVolumeRepository } from '@/nucleus/domain/repositories/atom-volume.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { AtomVolumePrismaMapper } from '../mappers/atom-volume.prisma-mapper';
import { Injectable } from '@nestjs/common';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { ResourceStatus } from '@prisma/client';

@Injectable()
export class AtomVolumePrismaRepository implements AtomVolumeRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: number): Promise<AtomVolumeEntity | null> {
    const volume = await this.prisma.atomVolume.findUnique({
      where: {
        id,
      },
    });

    if (!volume) {
      return null;
    }

    return AtomVolumePrismaMapper.toEntity(volume);
  }

  async findByOwnerIds(ownerIds: string[]): Promise<AtomVolumeEntity[]> {
    const volumes = await this.prisma.atomVolume.findMany({
      where: {
        ownerId: { in: ownerIds },
        status: { not: ResourceStatus.DELETED },
      },
    });

    return volumes.map(AtomVolumePrismaMapper.toEntity);
  }

  async findByAtomId(atomId: string): Promise<AtomVolumeEntity[]> {
    const volumes = await this.prisma.atomVolume.findMany({
      where: {
        atomId,
        status: { not: ResourceStatus.DELETED },
      },
    });

    return volumes.map(AtomVolumePrismaMapper.toEntity);
  }

  async create(entity: AtomVolumeEntity): Promise<AtomVolumeEntity> {
    const volume = await this.prisma.atomVolume.create({
      data: PrismaMapper.toCreate(entity),
    });

    return AtomVolumePrismaMapper.toEntity(volume);
  }

  async update(entity: AtomVolumeEntity): Promise<AtomVolumeEntity> {
    const volume = await this.prisma.atomVolume.update({
      where: {
        id: entity.id!,
      },
      data: PrismaMapper.toUpdate(entity),
    });

    return AtomVolumePrismaMapper.toEntity(volume);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.atomVolume.delete({
      where: {
        id,
      },
    });
  }
}

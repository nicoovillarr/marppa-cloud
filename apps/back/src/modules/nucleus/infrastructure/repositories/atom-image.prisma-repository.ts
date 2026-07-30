import { AtomImageEntity } from '@/nucleus/domain/entities/atom-image.entity';
import { AtomImageRepository } from '@/nucleus/domain/repositories/atom-image.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { AtomImagePrismaMapper } from '../mappers/atom-image.prisma-mapper';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class AtomImagePrismaRepository implements AtomImageRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: number): Promise<AtomImageEntity | null> {
    const image = await this.prisma.atomImage.findUnique({
      where: {
        id,
      },
    });

    if (!image) {
      return null;
    }

    return AtomImagePrismaMapper.toEntity(image);
  }

  async findAll(): Promise<AtomImageEntity[]> {
    const images = await this.prisma.atomImage.findMany({
      orderBy: { name: 'asc' },
    });

    return images.map(AtomImagePrismaMapper.toEntity);
  }

  async findAvailableFor(companyId: string): Promise<AtomImageEntity[]> {
    const images = await this.prisma.atomImage.findMany({
      where: { OR: [{ ownerId: null }, { ownerId: companyId }] },
      orderBy: { name: 'asc' },
    });

    return images.map(AtomImagePrismaMapper.toEntity);
  }

  async create(entity: AtomImageEntity): Promise<AtomImageEntity> {
    const image = await this.prisma.atomImage.create({
      data: PrismaMapper.toCreate(entity),
    });

    return AtomImagePrismaMapper.toEntity(image);
  }

  async update(entity: AtomImageEntity): Promise<AtomImageEntity> {
    const image = await this.prisma.atomImage.update({
      where: {
        id: entity.id!,
      },
      data: PrismaMapper.toCreate(entity),
    });

    return AtomImagePrismaMapper.toEntity(image);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.atomImage.delete({
      where: {
        id,
      },
    });
  }

  countAtoms(id: number): Promise<number> {
    return this.prisma.atom.count({
      where: {
        imageId: id,
      },
    });
  }
}

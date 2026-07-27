import { AtomImageEntity } from '@/nucleus/domain/entities/atom-image.entity';
import { AtomImageRepository } from '@/nucleus/domain/repositories/atom-image.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { AtomImagePrismaMapper } from '../mappers/atom-image.prisma-mapper';

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
}

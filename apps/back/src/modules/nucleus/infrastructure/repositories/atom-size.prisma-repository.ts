import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { AtomSizeEntity } from '@/nucleus/domain/entities/atom-size.entity';
import { AtomSizeRepository } from '@/nucleus/domain/repositories/atom-size.repository';
import { AtomSizePrismaMapper } from '../mappers/atom-size.prisma-mapper';

@Injectable()
export class AtomSizePrismaRepository implements AtomSizeRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: number): Promise<AtomSizeEntity | null> {
    const atomSize = await this.prisma.atomSize.findUnique({
      where: { id },
    });

    if (!atomSize) {
      return null;
    }

    return AtomSizePrismaMapper.toEntity(atomSize);
  }

  async findAll(includeDeprecated: boolean): Promise<AtomSizeEntity[]> {
    const atomSizes = await this.prisma.atomSize.findMany({
      where: includeDeprecated ? {} : { deprecatedAt: null },
      orderBy: { ramMB: 'asc' },
    });

    return atomSizes.map(AtomSizePrismaMapper.toEntity);
  }

  async findMaxVersion(name: string): Promise<number> {
    const { _max } = await this.prisma.atomSize.aggregate({
      where: { name },
      _max: { version: true },
    });

    return _max.version ?? 0;
  }

  async create(entity: AtomSizeEntity): Promise<AtomSizeEntity> {
    const atomSize = await this.prisma.atomSize.create({
      data: PrismaMapper.toCreate(entity),
    });

    return AtomSizePrismaMapper.toEntity(atomSize);
  }

  async restore(id: number): Promise<void> {
    await this.prisma.atomSize.update({
      where: { id },
      data: { deprecatedAt: null },
    });
  }

  async deprecate(id: number, deprecatedAt: Date): Promise<void> {
    await this.prisma.atomSize.update({
      where: { id },
      data: { deprecatedAt },
    });
  }
}

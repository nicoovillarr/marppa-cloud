import { AtomEntity } from '@/nucleus/domain/entities/atom.entity';
import { AtomWithRelationsModel } from '@/nucleus/domain/models/atom-with-relations.model';
import { AtomRepository } from '@/nucleus/domain/repositories/atom.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { Injectable } from '@nestjs/common';
import { AtomPrismaMapper } from '../mappers/atom.prisma-mapper';
import { AtomWithRelationsPrismaMapper } from '../mappers/atom-with-relations.prisma-mapper';

@Injectable()
export class AtomPrismaRepository implements AtomRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<AtomEntity | null> {
    const atom = await this.prisma.atom.findUnique({
      where: {
        id,
      },
    });

    if (!atom) {
      return null;
    }

    return AtomPrismaMapper.toEntity(atom);
  }

  async findByIdWithRelations(id: string): Promise<AtomWithRelationsModel | null> {
    const atom = await this.prisma.atom.findUnique({
      where: {
        id,
      },
      include: {
        image: true,
        node: true,
      },
    });

    if (!atom) {
      return null;
    }

    return AtomWithRelationsPrismaMapper.toDomain(atom);
  }

  async findByOwnerIds(ownerIds: string[]): Promise<AtomWithRelationsModel[]> {
    const atoms = await this.prisma.atom.findMany({
      where: {
        ownerId: { in: ownerIds },
      },
      include: {
        image: true,
        node: true,
      },
    });

    return atoms.map(AtomWithRelationsPrismaMapper.toDomain);
  }

  async create(entity: AtomEntity): Promise<AtomEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const atom = await this.prisma.atom.create({
      data: sanitized,
    });

    return AtomPrismaMapper.toEntity(atom);
  }

  async update(entity: AtomEntity): Promise<AtomEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const atom = await this.prisma.atom.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return AtomPrismaMapper.toEntity(atom);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.atom.delete({
      where: {
        id,
      },
    });
  }
}

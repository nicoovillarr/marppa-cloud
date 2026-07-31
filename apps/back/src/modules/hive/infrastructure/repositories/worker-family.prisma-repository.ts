import { WorkerFamilyEntity } from '@/hive/domain/entities/worker-family.entity';
import { WorkerFamilyRepository } from '@/hive/domain/repositories/worker-family.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkerFamilyPrismaMapper } from '../mappers/worker-family.prisma-mapper';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { WorkerFamilyWithFlavorsModel } from '@/hive/domain/models/worker-family-with-flavors.model';
import { WorkerFamilyWithFlavorsPrismaMapper } from '../mappers/worker-family-with-flavors.prisma-mapper';

@Injectable()
export class WorkerFamilyPrismaRepository implements WorkerFamilyRepository {
  constructor(private readonly prisma: PrismaService) { }

  findAvailableFor(
    companyIds: string[],
    includeDeprecated = false,
  ): Promise<WorkerFamilyWithFlavorsModel[]> {
    return this.query(includeDeprecated, {
      OR: [{ ownerId: null }, { ownerId: { in: companyIds } }],
    });
  }

  findAll(includeDeprecated = false): Promise<WorkerFamilyWithFlavorsModel[]> {
    return this.query(includeDeprecated, {});
  }

  private async query(
    includeDeprecated: boolean,
    scope: Prisma.WorkerFamilyWhereInput,
  ): Promise<WorkerFamilyWithFlavorsModel[]> {
    const activeOnly = includeDeprecated ? {} : { deprecatedAt: null };

    const workerFamilies = await this.prisma.workerFamily.findMany({
      where: { ...scope, ...activeOnly },
      include: {
        flavors: {
          where: activeOnly,
        },
      },
      orderBy: { name: 'asc' },
    });

    return workerFamilies.map(WorkerFamilyWithFlavorsPrismaMapper.toDomain);
  }

  async findById(id: number): Promise<WorkerFamilyEntity | null> {
    const workerFamily = await this.prisma.workerFamily.findUnique({
      where: {
        id,
      },
    });

    if (!workerFamily) {
      return null;
    }

    return WorkerFamilyPrismaMapper.toEntity(workerFamily);
  }

  async create(entity: WorkerFamilyEntity): Promise<WorkerFamilyEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFamily = await this.prisma.workerFamily.create({
      data: sanitized,
    });

    return WorkerFamilyPrismaMapper.toEntity(workerFamily);
  }

  async update(entity: WorkerFamilyEntity): Promise<WorkerFamilyEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const workerFamily = await this.prisma.workerFamily.update({
      where: {
        id: entity.id!,
      },
      data: sanitized,
    });

    return WorkerFamilyPrismaMapper.toEntity(workerFamily);
  }

  async restore(id: number): Promise<void> {
    await this.prisma.workerFamily.update({
      where: { id },
      data: { deprecatedAt: null },
    });
  }

  async deprecate(id: number, deprecatedAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.workerFamily.update({
        where: { id },
        data: { deprecatedAt },
      }),
      this.prisma.workerFlavor.updateMany({
        where: { familyId: id, deprecatedAt: null },
        data: { deprecatedAt },
      }),
    ]);
  }
}

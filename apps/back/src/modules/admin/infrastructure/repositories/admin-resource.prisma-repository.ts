import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import {
  AdminResourceFilter,
  AdminResourcePage,
  AdminResourceRepository,
} from '@/admin/domain/repositories/admin-resource.repository';
import {
  AdminResourceModel,
  AdminResourceType,
} from '@/admin/domain/models/admin-resource.model';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

interface OwnedRow {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  ownerId: string;
  owner: { name: string };
}

const OWNED_SELECT = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
  ownerId: true,
  owner: { select: { name: true } },
} as const;

interface ResourceSource {
  type: AdminResourceType;
  findMany: (args: any) => Promise<unknown[]>;
  count: (args: any) => Promise<number>;
}

@Injectable()
export class AdminResourcePrismaRepository implements AdminResourceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findPage(
    skip: number,
    take: number,
    filter: AdminResourceFilter,
  ): Promise<AdminResourcePage> {
    const where = filter.companyId ? { ownerId: filter.companyId } : {};
    const window = {
      where,
      select: OWNED_SELECT,
      orderBy: { createdAt: 'desc' as const },
      take: skip + take,
    };

    const sources = this.sourcesFor(filter.type);

    const pages = await Promise.all(
      sources.map(async ({ type, findMany, count }) => ({
        type,
        rows: (await findMany(window)) as OwnedRow[],
        count: await count({ where }),
      })),
    );

    const merged = pages
      .flatMap(({ rows, type }) => toModels(rows, type))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      items: merged.slice(skip, skip + take),
      total: pages.reduce((sum, { count }) => sum + count, 0),
    };
  }

  private sourcesFor(type?: AdminResourceType): ResourceSource[] {
    const { worker, atom, zone, portal } = this.prisma;

    const all: ResourceSource[] = [
      { type: 'Worker', findMany: (a) => worker.findMany(a), count: (a) => worker.count(a) },
      { type: 'Atom', findMany: (a) => atom.findMany(a), count: (a) => atom.count(a) },
      { type: 'Zone', findMany: (a) => zone.findMany(a), count: (a) => zone.count(a) },
      { type: 'Portal', findMany: (a) => portal.findMany(a), count: (a) => portal.count(a) },
    ];

    return type ? all.filter((source) => source.type === type) : all;
  }
}

function toModels(
  rows: OwnedRow[],
  type: AdminResourceType,
): AdminResourceModel[] {
  return rows.map(
    (row) =>
      new AdminResourceModel(
        row.id,
        type,
        row.name,
        row.status as ResourceStatus,
        row.ownerId,
        row.owner.name,
        row.createdAt,
      ),
  );
}

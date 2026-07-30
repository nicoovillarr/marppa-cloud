import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { AdminResourceRepository } from '@/admin/domain/repositories/admin-resource.repository';
import {
  AdminResourceModel,
  AdminResourceType,
} from '@/admin/domain/models/admin-resource.model';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

const ownedByCompany = {
  select: {
    id: true,
    name: true,
    status: true,
    createdAt: true,
    ownerId: true,
    owner: { select: { name: true } },
  },
  orderBy: { createdAt: 'desc' },
} as const;

interface OwnedRow {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  ownerId: string;
  owner: { name: string };
}

@Injectable()
export class AdminResourcePrismaRepository implements AdminResourceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<AdminResourceModel[]> {
    const [workers, atoms, zones, portals] = await Promise.all([
      this.prisma.worker.findMany(ownedByCompany),
      this.prisma.atom.findMany(ownedByCompany),
      this.prisma.zone.findMany(ownedByCompany),
      this.prisma.portal.findMany(ownedByCompany),
    ]);

    return [
      ...toModels(workers, 'Worker'),
      ...toModels(atoms, 'Atom'),
      ...toModels(zones, 'Zone'),
      ...toModels(portals, 'Portal'),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

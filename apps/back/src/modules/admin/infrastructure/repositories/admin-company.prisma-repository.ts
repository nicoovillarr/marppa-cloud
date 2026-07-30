import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import {
  AdminCompanyRepository,
  AdminCompanyWrite,
} from '@/admin/domain/repositories/admin-company.repository';
import { AdminCompanyModel } from '@/admin/domain/models/admin-company.model';

const withCounts = {
  _count: {
    select: {
      users: true,
      workers: true,
      atoms: true,
      zones: true,
      portals: true,
    },
  },
} satisfies Prisma.CompanySelect;

type CompanyWithCounts = Prisma.CompanyGetPayload<{
  include: typeof withCounts;
}>;

@Injectable()
export class AdminCompanyPrismaRepository implements AdminCompanyRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<AdminCompanyModel[]> {
    const companies = await this.prisma.company.findMany({
      include: withCounts,
      orderBy: { name: 'asc' },
    });

    return companies.map(toModel);
  }

  async findById(id: string): Promise<AdminCompanyModel | null> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: withCounts,
    });

    return company ? toModel(company) : null;
  }

  async findRoot(): Promise<AdminCompanyModel | null> {
    const company = await this.prisma.company.findFirst({
      where: { parentCompanyId: null },
      include: withCounts,
      orderBy: { createdAt: 'asc' },
    });

    return company ? toModel(company) : null;
  }

  async create(data: AdminCompanyWrite): Promise<AdminCompanyModel> {
    const company = await this.prisma.company.create({
      data: {
        name: data.name,
        alias: data.alias,
        description: data.description,
        parentCompanyId: data.parentCompanyId,
      },
      include: withCounts,
    });

    return toModel(company);
  }

  async update(
    id: string,
    data: AdminCompanyWrite,
  ): Promise<AdminCompanyModel> {
    const company = await this.prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        alias: data.alias,
        description: data.description,
        parentCompanyId: data.parentCompanyId,
      },
      include: withCounts,
    });

    return toModel(company);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.company.delete({
      where: { id },
    });
  }
}

function toModel(company: CompanyWithCounts): AdminCompanyModel {
  return new AdminCompanyModel(
    company.id,
    company.name,
    company.alias,
    company.description,
    company.parentCompanyId,
    company.createdAt,
    company.updatedAt,
    {
      users: company._count.users,
      workers: company._count.workers,
      atoms: company._count.atoms,
      zones: company._count.zones,
      portals: company._count.portals,
    },
  );
}

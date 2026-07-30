import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import {
  AdminUserRepository,
  AdminUserWrite,
} from '@/admin/domain/repositories/admin-user.repository';
import { AdminUserModel } from '@/admin/domain/models/admin-user.model';

const withCompany = {
  company: {
    select: { name: true },
  },
} satisfies Prisma.UserInclude;

type UserWithCompany = Prisma.UserGetPayload<{ include: typeof withCompany }>;

@Injectable()
export class AdminUserPrismaRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<AdminUserModel[]> {
    const users = await this.prisma.user.findMany({
      include: withCompany,
      orderBy: { email: 'asc' },
    });

    return users.map(toModel);
  }

  async findById(id: string): Promise<AdminUserModel | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: withCompany,
    });

    return user ? toModel(user) : null;
  }

  async update(id: string, data: AdminUserWrite): Promise<AdminUserModel> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        companyId: data.companyId,
      },
      include: withCompany,
    });

    return toModel(user);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.token.deleteMany({ where: { userId: id } }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }

  async revokeSessions(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.token.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
  }

  countOwners(companyId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        companyId,
        role: UserRole.OWNER,
      },
    });
  }
}

function toModel(user: UserWithCompany): AdminUserModel {
  return new AdminUserModel(
    user.id,
    user.email,
    user.name,
    user.role,
    user.companyId,
    user.company.name,
    user.createdAt,
    user.updatedAt,
  );
}

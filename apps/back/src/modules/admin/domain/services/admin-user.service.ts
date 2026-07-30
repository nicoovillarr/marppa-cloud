import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@marppa-cloud/db';

import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UserService } from '@/user/domain/services/user.service';
import {
  ADMIN_USER_REPOSITORY_SYMBOL,
  AdminUserPage,
  AdminUserRepository,
} from '../repositories/admin-user.repository';
import { AdminUserModel } from '../models/admin-user.model';
import { CreateAdminUserDto } from '@/admin/presentation/dtos/create-admin-user.dto';
import { UpdateAdminUserDto } from '@/admin/presentation/dtos/update-admin-user.dto';
import { LastOwnerProtectedError } from '../errors/last-owner-protected.error';
import { SelfDemotionError } from '../errors/self-demotion.error';

export interface AdminUserUpdateResult {
  user: AdminUserModel;
  sessionsRevoked: boolean;
}

@Injectable()
export class AdminUserService {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY_SYMBOL)
    private readonly repository: AdminUserRepository,
    private readonly userService: UserService,
  ) { }

  findPage(skip: number, take: number): Promise<AdminUserPage> {
    return this.repository.findPage(skip, take);
  }

  async findById(id: string): Promise<AdminUserModel> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError();
    }

    return user;
  }

  async create(data: CreateAdminUserDto): Promise<AdminUserModel> {
    const created = await this.userService.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      companyId: data.companyId,
    });

    if (data.role && data.role !== created.role) {
      return this.repository.update(created.id!, { role: data.role });
    }

    return this.findById(created.id!);
  }

  async update(
    id: string,
    data: UpdateAdminUserDto,
  ): Promise<AdminUserUpdateResult> {
    const user = await this.findById(id);

    if (user.id === getCurrentUser()?.userId && this.demotesSelf(user, data)) {
      throw new SelfDemotionError();
    }

    if (this.leavesCompanyOwnerless(user, data)) {
      await this.assertNotLastOwner(user);
    }

    const updated = await this.repository.update(id, {
      name: data.name,
      email: data.email?.toLowerCase(),
      role: data.role,
      companyId: data.companyId,
    });

    if (data.password) {
      await this.userService.updateUserPassword(id, data.password);
    }

    const sessionsRevoked = this.invalidatesCredentials(user, data);
    if (sessionsRevoked) {
      await this.repository.revokeSessions(id);
    }

    return { user: updated, sessionsRevoked };
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);

    if (user.id === getCurrentUser()?.userId) {
      throw new SelfDemotionError();
    }

    if (user.role === UserRole.OWNER) {
      await this.assertNotLastOwner(user);
    }

    await this.repository.delete(id);
  }

  private invalidatesCredentials(
    user: AdminUserModel,
    data: UpdateAdminUserDto,
  ): boolean {
    return (
      data.password != null ||
      (data.role != null && data.role !== user.role) ||
      (data.companyId != null && data.companyId !== user.companyId) ||
      (data.email != null && data.email.toLowerCase() !== user.email)
    );
  }

  private demotesSelf(
    user: AdminUserModel,
    data: UpdateAdminUserDto,
  ): boolean {
    const demoted = data.role != null && data.role !== user.role;
    const moved = data.companyId != null && data.companyId !== user.companyId;

    return demoted || moved;
  }

  private leavesCompanyOwnerless(
    user: AdminUserModel,
    data: UpdateAdminUserDto,
  ): boolean {
    if (user.role !== UserRole.OWNER) return false;

    const demoted = data.role != null && data.role !== UserRole.OWNER;
    const moved = data.companyId != null && data.companyId !== user.companyId;

    return demoted || moved;
  }

  private async assertNotLastOwner(user: AdminUserModel): Promise<void> {
    const owners = await this.repository.countOwners(user.companyId);
    if (owners <= 1) {
      throw new LastOwnerProtectedError(user.companyName);
    }
  }
}

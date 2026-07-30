import { Injectable } from '@nestjs/common';

import { UserService } from '@/user/domain/services/user.service';
import {
  toUserResponse,
  type UserResponse,
} from '@/user/application/models/user.response';
import { UserEntity } from '@/user/domain/entities/user.entity';
import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';

@Injectable()
export class UserApiService {
  constructor(
    private readonly userService: UserService,
    private readonly platformAdminService: PlatformAdminService,
  ) { }

  async findCurrentUser(): Promise<UserResponse | null> {
    const user = await this.userService.findCurrentUser();
    return user ? this.toResponse(user) : null;
  }

  async findUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.userService.findUserById(userId);
    return user ? this.toResponse(user) : null;
  }

  private async toResponse(user: UserEntity): Promise<UserResponse> {
    const isPlatformAdmin = await this.platformAdminService.isPlatformAdminFor(
      user.companyId,
      user.role,
    );

    return toUserResponse(user, isPlatformAdmin);
  }
}

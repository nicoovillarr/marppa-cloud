import { Injectable } from '@nestjs/common';

import { UserService } from '@/user/domain/services/user.service';
import {
  toUserResponse,
  type UserResponse,
} from '@/user/application/models/user.response';

@Injectable()
export class UserApiService {
  constructor(private readonly userService: UserService) { }

  async findCurrentUser(): Promise<UserResponse | null> {
    const user = await this.userService.findCurrentUser();
    return user ? toUserResponse(user) : null;
  }

  async findUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.userService.findUserById(userId);
    return user ? toUserResponse(user) : null;
  }
}

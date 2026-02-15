import { Injectable } from '@nestjs/common';

import { UserEntity } from '@/user/domain/entities/user.entity';
import { UserService } from '@/user/domain/services/user.service';

@Injectable()
export class UserApiService {
  constructor(private readonly userService: UserService) { }

  async findCurrentUser(): Promise<UserEntity | null> {
    return await this.userService.findCurrentUser();
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return await this.userService.findUserById(userId);
  }
}

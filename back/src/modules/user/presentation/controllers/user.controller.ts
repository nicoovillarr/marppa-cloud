import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { UserApiService } from '@/user/application/services/user.api-service';
import { LoggedInGuard } from '@/auth/presentation/guards/logged-in.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userApiService: UserApiService) { }

  @Get('me')
  @UseGuards(LoggedInGuard)
  async getCurrentUser() {
    return await this.userApiService.findCurrentUser();
  }

  @Get(':id')
  @UseGuards(LoggedInGuard)
  async getUserById(@Param('id') id: string) {
    return await this.userApiService.findUserById(id);
  }
}

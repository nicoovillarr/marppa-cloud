import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthApiService } from '@/auth/application/services/auth.api-service';
import { LoginUserDto } from '@/auth/presentation/dtos/login-user.dto';

import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';
import { LoggedInGuard } from '../guards/logged-in.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authApiService: AuthApiService) { }

  @Post('register')
  async register(@Body() data: CreateUserDto, @Req() req: Request) {
    return await this.authApiService.register(data, req);
  }

  @Post('login')
  async login(@Body() data: LoginUserDto, @Req() req: Request) {
    return await this.authApiService.login(data, req);
  }

  @Post('logout')
  @UseGuards(LoggedInGuard)
  async logout(@Req() req: Request) {
    return await this.authApiService.logout(req);
  }

  @Get('tick')
  @UseGuards(LoggedInGuard)
  async tick(@Req() req: Request) {
    return await this.authApiService.tick(req);
  }
}

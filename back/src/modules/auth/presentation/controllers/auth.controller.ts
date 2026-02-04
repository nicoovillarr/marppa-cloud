import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';

import { AuthApiService } from '@/auth/application/auth-api.service';
import { LoginUserDto } from '@/auth/presentation/dtos/login-user.dto';

import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';

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

  @Get('tick')
  async tick(@Query('refreshToken') refreshToken: string, @Req() req: Request) {
    return await this.authApiService.tick(refreshToken, req);
  }
}

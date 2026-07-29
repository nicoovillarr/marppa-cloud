import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { AuthApiService } from '@/auth/application/services/auth.api-service';
import { LoginUserDto } from '@/auth/presentation/dtos/login-user.dto';

import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';
import { ResetPasswordDto } from '@/auth/presentation/dtos/reset-password.dto';
import { ConfirmNewPasswordDto } from '@/auth/presentation/dtos/confirm-new-password.dto';
import { LoggedInGuard } from '../guards/logged-in.guard';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authApiService: AuthApiService) { }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(@Body() data: CreateUserDto, @Req() req: Request) {
    return await this.authApiService.register(data, req);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() data: LoginUserDto, @Req() req: Request) {
    return await this.authApiService.login(data, req);
  }

  @Post('logout')
  @UseGuards(LoggedInGuard)
  async logout(@Req() req: Request) {
    return await this.authApiService.logout(req);
  }

  // Public: tick refreshes the session from the refresh-token cookie, so it
  // must be reachable when the access token has already expired.
  @Public()
  @Get('tick')
  async tick(@Req() req: Request) {
    return await this.authApiService.tick(req);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  async requestPasswordReset(
    @Body() data: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return await this.authApiService.requestPasswordReset(data, req);
  }

  @Public()
  @Post('reset-password/confirm')
  async confirmNewPassword(@Body() data: ConfirmNewPasswordDto) {
    return await this.authApiService.confirmNewPassword(data);
  }

  // The access token lives in an httpOnly cookie, so the browser JS cannot
  // read it. The WebSocket server authenticates with the same JWT, so expose
  // it to an already-authenticated session for the WS handshake.
  @Get('ws-token')
  @UseGuards(LoggedInGuard)
  wsToken(@Req() req: Request): { token: string } {
    return { token: req.cookies?.access_token };
  }
}

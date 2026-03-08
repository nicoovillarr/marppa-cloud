import { Injectable } from '@nestjs/common';
import { Request } from 'express';

import { AuthCache } from '@/auth/infrastructure/cache/auth.cache';
import { AuthService } from '@/auth/domain/services/auth.service';
import { LoginUserDto } from '@/auth/presentation/dtos/login-user.dto';

import { UserService } from '@/user/domain/services/user.service';
import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { Utils } from 'src/libs/utils';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';

@Injectable()
export class AuthApiService {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly cache: AuthCache,
  ) { }

  async register(
    data: CreateUserDto,
    req: Request,
  ): Promise<void> {
    const user = await this.userService.createUser(data);
    if (!user.id) {
      throw new Error('Could not create user');
    }

    const { refreshToken } =
      await this.authService.generateAndSaveUserTokens(user);

    const requestData = Utils.parseRequestData(req);

    await this.authService.createSessionForUser(
      user.id,
      refreshToken,
      requestData,
    );
  }

  async login(
    data: LoginUserDto,
    req: Request,
  ): Promise<void> {
    const { email, password } = data;
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await this.userService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const { refreshToken } =
      await this.authService.generateAndSaveUserTokens(user);

    const requestData = Utils.parseRequestData(req);

    await this.authService.createSessionForUser(
      user.id!,
      refreshToken,
      requestData,
    );
  }

  async logout(req: Request) {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    await this.authService.invalidateSession(refreshToken);
  }

  async tick(req: Request): Promise<boolean> {
    const oldRefreshToken = req.cookies.refresh_token;
    if (!oldRefreshToken) {
      return false;
    }

    const userId = await this.validateRefreshToken(oldRefreshToken);
    if (!userId) {
      return false;
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      return false;
    }

    const { refreshToken: newRefreshToken } =
      await this.authService.generateAndSaveUserTokens(user);

    const requestData = Utils.parseRequestData(req);

    await this.authService.createSessionForUser(
      user.id!,
      newRefreshToken,
      requestData,
    );

    return true;
  }

  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    const session =
      await this.authService.findSessionByRefreshToken(refreshToken);

    if (!session) {
      return null;
    }

    return session.userId;
  }

  async getTokenInformation(refreshToken: string): Promise<JwtEntity | null> {
    return await this.authService.getTokenInformation(refreshToken);
  }
}

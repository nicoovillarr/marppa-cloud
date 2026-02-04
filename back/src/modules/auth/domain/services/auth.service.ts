import { Inject, Injectable } from '@nestjs/common';

import { SessionEntity } from '@/auth/domain/entities/session.entity';
import { type TokenGenerator } from '@/auth/domain/services/token-generator.service';
import { TOKEN_GENERATOR_SYMBOL } from '@/auth/domain/services/token-generator.service';
import { AUTH_REPOSITORY_SYMBOL } from '@/auth/domain/repositories/auth.repository';
import { type AuthRepository } from '@/auth/domain/repositories/auth.repository';
import { TOKEN_STORAGE_SERVICE_SYMBOL } from './token-storage.service';
import { type TokenStorageService } from './token-storage.service';

import { UserEntity } from '@/user/domain/entities/user.entity';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { RequestData } from 'src/types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY_SYMBOL)
    private readonly repo: AuthRepository,

    @Inject(TOKEN_GENERATOR_SYMBOL)
    private readonly tokenGenerator: TokenGenerator,

    @Inject(TOKEN_STORAGE_SERVICE_SYMBOL)
    private readonly tokenStorageService: TokenStorageService,
  ) { }

  async generateAndSaveUserTokens(user: UserEntity): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.tokenGenerator.generateJwt(user, 'access');
    const refreshToken = await this.tokenGenerator.generateJwt(user, 'refresh');

    this.tokenStorageService.setAccessToken(accessToken);
    this.tokenStorageService.setRefreshToken(refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async createSessionForUser(
    userId: string,
    refreshToken: string,
    requestData: RequestData,
  ): Promise<SessionEntity> {
    const { ipAddress, userAgent, platform, device, browser } = requestData;

    const session: SessionEntity = new SessionEntity(
      userId,
      ipAddress,
      userAgent,
      platform,
      device,
      browser,
      {
        refreshToken,
      },
    );

    return await this.repo.createSession(session);
  }

  async invalidateSession(refreshToken: string): Promise<void> {
    await this.repo.deleteSessionByRefreshToken(refreshToken);
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<SessionEntity | null> {
    return await this.repo.findSessionByRefreshToken(refreshToken);
  }

  async getTokenInformation(refreshToken: string): Promise<JwtEntity | null> {
    try {
      const tokenInfo = await this.tokenGenerator.validateJwt(refreshToken);
      return tokenInfo;
    } catch {
      return null;
    }
  }
}

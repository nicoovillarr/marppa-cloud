import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { SessionEntity } from '@/auth/domain/entities/session.entity';
import { type TokenGenerator } from '@/auth/domain/services/token-generator.service';
import { TOKEN_GENERATOR_SYMBOL } from '@/auth/domain/services/token-generator.service';
import { AUTH_REPOSITORY_SYMBOL } from '@/auth/domain/repositories/auth.repository';
import { type AuthRepository } from '@/auth/domain/repositories/auth.repository';
import { TOKEN_STORAGE_SERVICE_SYMBOL } from './token-storage.service';
import { type TokenStorageService } from './token-storage.service';

import { UserEntity } from '@/user/domain/entities/user.entity';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { RequestData } from '../../../../libs/utils';

const ROTATION_GRACE_MS = 30 * 1000;

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
    const csrfToken = randomBytes(32).toString('base64url');

    this.tokenStorageService.setAccessToken(accessToken);
    this.tokenStorageService.setRefreshToken(refreshToken);
    this.tokenStorageService.setCsrfToken(csrfToken);

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
    this.tokenStorageService.clear();
  }

  clearCookies(): void {
    this.tokenStorageService.clear();
  }

  async deleteSession(refreshToken: string): Promise<void> {
    await this.repo.deleteSessionByRefreshToken(refreshToken);
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<SessionEntity | null> {
    return await this.repo.findSessionByRefreshToken(refreshToken);
  }

  async wasRotatedRecently(refreshToken: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - ROTATION_GRACE_MS);

    const expired = await this.repo.findExpiredSessionByRefreshToken(
      refreshToken,
      cutoff,
    );
    if (!expired) {
      return false;
    }

    return await this.repo.hasActiveSessionCreatedSince(expired.userId, cutoff);
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

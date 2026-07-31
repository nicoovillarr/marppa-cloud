import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import { AuthApiService } from './auth.api-service';
import { AuthService } from '@/auth/domain/services/auth.service';
import { AuthCache } from '@/auth/infrastructure/cache/auth.cache';
import { UserService } from '@/user/domain/services/user.service';
import { TokenService } from '@/tokens/domain/services/token.service';
import { UserEntity } from '@/user/domain/entities/user.entity';
import { SessionEntity } from '@/auth/domain/entities/session.entity';

describe('AuthApiService', () => {
  let service: AuthApiService;

  const mockUser: UserEntity = new UserEntity(
    'test@example.com',
    'hashedPassword123',
    'Test User',
    'c-000001',
    { id: 'u-000001' },
  );

  const mockSession: SessionEntity = new SessionEntity(
    'u-000001',
    '192.168.1.1',
    'Mozilla/5.0',
    'Windows',
    'Desktop',
    'Chrome',
    { refreshToken: 'refresh-token-123' },
  );

  const mockAuthService = {
    invalidateSession: jest.fn(),
    clearCookies: jest.fn(),
    deleteSession: jest.fn(),
    findSessionByRefreshToken: jest.fn(),
    wasRotatedRecently: jest.fn(),
    generateAndSaveUserTokens: jest.fn(),
    createSessionForUser: jest.fn(),
  };

  const mockUserService = {
    findUserForSessionRefresh: jest.fn(),
  };

  const requestWith = (cookies: Record<string, string>) =>
    ({
      cookies,
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: { remoteAddress: '192.168.1.1' },
    }) as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthApiService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: AuthCache, useValue: {} },
        { provide: TokenService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthApiService>(AuthApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should invalidate the session when the browser still has a refresh token', async () => {
      await service.logout(requestWith({ refresh_token: 'refresh-token-123' }));

      expect(mockAuthService.invalidateSession).toHaveBeenCalledWith(
        'refresh-token-123',
      );
    });

    it('should clear the cookies instead of failing when the refresh token is gone', async () => {
      await service.logout(requestWith({ has_session: '1' }));

      expect(mockAuthService.invalidateSession).not.toHaveBeenCalled();
      expect(mockAuthService.clearCookies).toHaveBeenCalled();
    });
  });

  describe('tick', () => {
    it('should clear the cookies when there is no refresh token', async () => {
      const result = await service.tick(requestWith({ has_session: '1' }));

      expect(result).toBe(false);
      expect(mockAuthService.clearCookies).toHaveBeenCalled();
    });

    it('should clear the cookies when the session is no longer stored', async () => {
      mockAuthService.findSessionByRefreshToken.mockResolvedValue(null);

      const result = await service.tick(
        requestWith({ refresh_token: 'refresh-token-123' }),
      );

      expect(result).toBe(false);
      expect(mockAuthService.clearCookies).toHaveBeenCalled();
    });

    it('should keep the cookies of a parallel request that just rotated the same token', async () => {
      mockAuthService.findSessionByRefreshToken.mockResolvedValue(null);
      mockAuthService.wasRotatedRecently.mockResolvedValue(true);

      const result = await service.tick(
        requestWith({ refresh_token: 'refresh-token-123' }),
      );

      expect(result).toBe(true);
      expect(mockAuthService.clearCookies).not.toHaveBeenCalled();
      expect(mockAuthService.generateAndSaveUserTokens).not.toHaveBeenCalled();
    });

    it('should clear the cookies when the session points at a missing user', async () => {
      mockAuthService.findSessionByRefreshToken.mockResolvedValue(mockSession);
      mockUserService.findUserForSessionRefresh.mockResolvedValue(null);

      const result = await service.tick(
        requestWith({ refresh_token: 'refresh-token-123' }),
      );

      expect(result).toBe(false);
      expect(mockAuthService.clearCookies).toHaveBeenCalled();
    });

    it('should rotate the refresh token and drop the previous session', async () => {
      mockAuthService.findSessionByRefreshToken.mockResolvedValue(mockSession);
      mockUserService.findUserForSessionRefresh.mockResolvedValue(mockUser);
      mockAuthService.generateAndSaveUserTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await service.tick(
        requestWith({ refresh_token: 'refresh-token-123' }),
      );

      expect(result).toBe(true);
      expect(mockAuthService.createSessionForUser).toHaveBeenCalledWith(
        'u-000001',
        'new-refresh-token',
        expect.anything(),
      );
      expect(mockAuthService.deleteSession).toHaveBeenCalledWith(
        'refresh-token-123',
      );
      expect(mockAuthService.clearCookies).not.toHaveBeenCalled();
    });
  });
});

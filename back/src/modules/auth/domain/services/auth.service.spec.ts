import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository, AUTH_REPOSITORY_SYMBOL } from '../repositories/auth.repository';
import { TokenGenerator, TOKEN_GENERATOR_SYMBOL } from './token-generator.service';
import { TokenStorageService, TOKEN_STORAGE_SERVICE_SYMBOL } from './token-storage.service';
import { SessionEntity } from '../entities/session.entity';
import { UserEntity } from '@/user/domain/entities/user.entity';
import { JwtEntity } from '../entities/jwt.entity';
import { RequestData } from 'src/types';

describe('AuthService', () => {
  let service: AuthService;
  let repository: AuthRepository;
  let tokenGenerator: TokenGenerator;
  let tokenStorageService: TokenStorageService;

  const mockUser: UserEntity = new UserEntity(
    'test@example.com',
    'hashedPassword123',
    'Test User',
    'c-000001',
    {
      id: 'u-000001',
    }
  );

  const mockRequestData: RequestData = {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    platform: 'Windows',
    device: 'Desktop',
    browser: 'Chrome',
  };

  const mockSession: SessionEntity = new SessionEntity(
    'u-000001',
    '192.168.1.1',
    'Mozilla/5.0',
    'Windows',
    'Desktop',
    'Chrome',
    {
      refreshToken: 'refresh-token-123',
    }
  );

  const mockJwtEntity: JwtEntity = new JwtEntity(
    'u-000001',
    'test@example.com',
    'c-000001',
    'refresh',
  );

  const mockAuthRepository = {
    createSession: jest.fn(),
    deleteSessionByRefreshToken: jest.fn(),
    findSessionByRefreshToken: jest.fn(),
  };

  const mockTokenGenerator = {
    generateJwt: jest.fn(),
    validateJwt: jest.fn(),
  };

  const mockTokenStorageService = {
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AUTH_REPOSITORY_SYMBOL,
          useValue: mockAuthRepository,
        },
        {
          provide: TOKEN_GENERATOR_SYMBOL,
          useValue: mockTokenGenerator,
        },
        {
          provide: TOKEN_STORAGE_SERVICE_SYMBOL,
          useValue: mockTokenStorageService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get<AuthRepository>(AUTH_REPOSITORY_SYMBOL);
    tokenGenerator = module.get<TokenGenerator>(TOKEN_GENERATOR_SYMBOL);
    tokenStorageService = module.get<TokenStorageService>(TOKEN_STORAGE_SERVICE_SYMBOL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSaveUserTokens', () => {
    it('should generate access and refresh tokens and save them', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-123';

      mockTokenGenerator.generateJwt
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);

      const result = await service.generateAndSaveUserTokens(mockUser);

      expect(tokenGenerator.generateJwt).toHaveBeenCalledWith(mockUser, 'access');
      expect(tokenGenerator.generateJwt).toHaveBeenCalledWith(mockUser, 'refresh');
      expect(tokenStorageService.setAccessToken).toHaveBeenCalledWith(accessToken);
      expect(tokenStorageService.setRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual({ accessToken, refreshToken });
    });
  });

  describe('createSessionForUser', () => {
    it('should create a session for a user', async () => {
      mockAuthRepository.createSession.mockResolvedValue(mockSession);

      const result = await service.createSessionForUser(
        'u-000001',
        'refresh-token-123',
        mockRequestData
      );

      expect(repository.createSession).toHaveBeenCalledWith(
        expect.any(SessionEntity)
      );
      expect(result).toEqual(mockSession);

      const sessionArg = (repository.createSession as jest.Mock).mock.calls[0][0];
      expect(sessionArg.userId).toBe('u-000001');
      expect(sessionArg.ipAddress).toBe('192.168.1.1');
      expect(sessionArg.userAgent).toBe('Mozilla/5.0');
      expect(sessionArg.platform).toBe('Windows');
      expect(sessionArg.device).toBe('Desktop');
      expect(sessionArg.browser).toBe('Chrome');
      expect(sessionArg.refreshToken).toBe('refresh-token-123');
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate a session by refresh token', async () => {
      mockAuthRepository.deleteSessionByRefreshToken.mockResolvedValue(undefined);

      await service.invalidateSession('refresh-token-123');

      expect(repository.deleteSessionByRefreshToken).toHaveBeenCalledWith('refresh-token-123');
    });
  });

  describe('findSessionByRefreshToken', () => {
    it('should return a session by refresh token', async () => {
      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(mockSession);

      const result = await service.findSessionByRefreshToken('refresh-token-123');

      expect(repository.findSessionByRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(result).toEqual(mockSession);
    });

    it('should return null if session not found', async () => {
      mockAuthRepository.findSessionByRefreshToken.mockResolvedValue(null);

      const result = await service.findSessionByRefreshToken('invalid-token');

      expect(repository.findSessionByRefreshToken).toHaveBeenCalledWith('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('getTokenInformation', () => {
    it('should return token information for valid token', async () => {
      mockTokenGenerator.validateJwt.mockResolvedValue(mockJwtEntity);

      const result = await service.getTokenInformation('refresh-token-123');

      expect(tokenGenerator.validateJwt).toHaveBeenCalledWith('refresh-token-123');
      expect(result).toEqual(mockJwtEntity);
    });

    it('should return null for invalid token', async () => {
      mockTokenGenerator.validateJwt.mockRejectedValue(new Error('Invalid token'));

      const result = await service.getTokenInformation('invalid-token');

      expect(tokenGenerator.validateJwt).toHaveBeenCalledWith('invalid-token');
      expect(result).toBeNull();
    });
  });
});

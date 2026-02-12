import { Test, TestingModule } from '@nestjs/testing';
import { AuthPrismaRepository } from './auth.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { SessionEntity } from '../../domain/entities/session.entity';

describe('AuthPrismaRepository (Integration)', () => {
  const testRefreshToken = 'test-refresh-token-integration';
  const userId = 'u-000001';

  let repository: AuthPrismaRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<AuthPrismaRepository>(AuthPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        refreshToken: { contains: 'test-refresh-token' },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdSessionRefreshToken: string;

    it('should create a session', async () => {
      const session = new SessionEntity(
        userId,
        '192.168.1.100',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Windows',
        'Desktop',
        'Chrome',
        {
          refreshToken: testRefreshToken,
        }
      );

      const result = await repository.createSession(session);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.ipAddress).toBe('192.168.1.100');
      expect(result.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(result.platform).toBe('Windows');
      expect(result.device).toBe('Desktop');
      expect(result.browser).toBe('Chrome');
      expect(result.refreshToken).toBe(testRefreshToken);
      expect(result.expiredAt).toBeUndefined();
      createdSessionRefreshToken = result.refreshToken!;
    });

    it('should find a session by refresh token', async () => {
      const result = await repository.findSessionByRefreshToken(createdSessionRefreshToken);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.refreshToken).toBe(createdSessionRefreshToken);
      expect(result?.ipAddress).toBe('192.168.1.100');
      expect(result?.platform).toBe('Windows');
    });

    it('should return null for non-existent refresh token', async () => {
      const result = await repository.findSessionByRefreshToken('non-existent-token');

      expect(result).toBeNull();
    });

    it('should delete (soft delete) a session by refresh token', async () => {
      await repository.deleteSessionByRefreshToken(createdSessionRefreshToken);

      const session = await prisma.session.findFirst({
        where: { refreshToken: createdSessionRefreshToken },
      });

      expect(session).toBeDefined();
      expect(session?.expiredAt).toBeDefined();
      expect(session?.expiredAt).toBeInstanceOf(Date);
    });

    it('should not find expired session by refresh token', async () => {
      const result = await repository.findSessionByRefreshToken(createdSessionRefreshToken);

      expect(result).toBeNull();
    });

    it('should create another session for cleanup test', async () => {
      const session = new SessionEntity(
        userId,
        '192.168.1.101',
        'Mozilla/5.0',
        'Linux',
        'Mobile',
        'Firefox',
        {
          refreshToken: 'test-refresh-token-cleanup',
        }
      );

      const result = await repository.createSession(session);

      expect(result).toBeDefined();
      expect(result.refreshToken).toBe('test-refresh-token-cleanup');
    });
  });
});

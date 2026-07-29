import { Test, TestingModule } from '@nestjs/testing';
import { AuthCache } from './auth.cache';
import { CACHE_STORAGE_SYMBOL } from '@/shared/domain/services/cache.service';

describe('AuthCache', () => {
  let cache: AuthCache;

  const mockCacheStorage = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthCache,
        {
          provide: CACHE_STORAGE_SYMBOL,
          useValue: mockCacheStorage,
        },
      ],
    }).compile();

    cache = module.get<AuthCache>(AuthCache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedLogin', () => {
    it('starts the counter at 1 for a first failed attempt', async () => {
      mockCacheStorage.get.mockResolvedValue(undefined);

      await cache.recordFailedLogin('user@example.com');

      expect(mockCacheStorage.set).toHaveBeenCalledWith(
        'auth:login-attempts:user@example.com',
        1,
        900,
      );
    });

    it('increments an existing counter', async () => {
      mockCacheStorage.get.mockResolvedValue(3);

      await cache.recordFailedLogin('user@example.com');

      expect(mockCacheStorage.set).toHaveBeenCalledWith(
        'auth:login-attempts:user@example.com',
        4,
        900,
      );
    });

    it('normalizes the email key to lowercase', async () => {
      mockCacheStorage.get.mockResolvedValue(undefined);

      await cache.recordFailedLogin('User@Example.com');

      expect(mockCacheStorage.set).toHaveBeenCalledWith(
        'auth:login-attempts:user@example.com',
        1,
        900,
      );
    });
  });

  describe('isLoginLockedOut', () => {
    it('is not locked out below the threshold', async () => {
      mockCacheStorage.get.mockResolvedValue(4);

      await expect(cache.isLoginLockedOut('user@example.com')).resolves.toBe(
        false,
      );
    });

    it('is locked out at the threshold', async () => {
      mockCacheStorage.get.mockResolvedValue(5);

      await expect(cache.isLoginLockedOut('user@example.com')).resolves.toBe(
        true,
      );
    });

    it('is not locked out with no recorded attempts', async () => {
      mockCacheStorage.get.mockResolvedValue(undefined);

      await expect(cache.isLoginLockedOut('user@example.com')).resolves.toBe(
        false,
      );
    });
  });

  describe('clearFailedLogins', () => {
    it('deletes the counter key', async () => {
      await cache.clearFailedLogins('user@example.com');

      expect(mockCacheStorage.delete).toHaveBeenCalledWith(
        'auth:login-attempts:user@example.com',
      );
    });
  });
});

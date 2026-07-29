import { ExecutionContext } from '@nestjs/common';
import { CompanyRateLimitGuard } from './company-rate-limit.guard';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { TooManyRequestsError } from '@/shared/domain/errors/too-many-requests.error';

describe('CompanyRateLimitGuard', () => {
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const guard = new CompanyRateLimitGuard(mockCache as any);

  function buildContext(method: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method }),
      }),
    } as any;
  }

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EVENT_QUEUE_RATE_LIMIT_PER_MINUTE;
  });

  it('allows non-mutating requests without checking the cache', async () => {
    const result = await guard.canActivate(buildContext('GET'));

    expect(result).toBe(true);
    expect(mockCache.get).not.toHaveBeenCalled();
  });

  it('allows mutating requests with no session (other guards handle auth)', async () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue(null);

    const result = await guard.canActivate(buildContext('POST'));

    expect(result).toBe(true);
    expect(mockCache.get).not.toHaveBeenCalled();
  });

  it('allows a mutating request under the limit and increments the counter', async () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-1',
      companyId: 'c-1',
    } as any);
    mockCache.get.mockResolvedValue(5);

    const result = await guard.canActivate(buildContext('POST'));

    expect(result).toBe(true);
    expect(mockCache.set).toHaveBeenCalledWith('event-queue-rate:c-1', 6, 60);
  });

  it('rejects a mutating request once the company hits the limit', async () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-1',
      companyId: 'c-1',
    } as any);
    process.env.EVENT_QUEUE_RATE_LIMIT_PER_MINUTE = '10';
    mockCache.get.mockResolvedValue(10);

    await expect(guard.canActivate(buildContext('DELETE'))).rejects.toThrow(
      TooManyRequestsError,
    );
    expect(mockCache.set).not.toHaveBeenCalled();
  });
});

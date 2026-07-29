import { ForbiddenException } from '@nestjs/common';
import { CsrfOriginMiddleware } from './csrf-origin.middleware';

describe('CsrfOriginMiddleware', () => {
  const ORIGINAL_ENV = process.env.CORS_URL;

  afterEach(() => {
    process.env.CORS_URL = ORIGINAL_ENV;
  });

  function buildRequest(overrides: Partial<Record<string, any>> = {}) {
    return {
      method: 'POST',
      headers: {},
      ...overrides,
    } as any;
  }

  it('allows mutating requests with an allowed Origin', () => {
    process.env.CORS_URL = 'https://cloud.marppa.com';
    const middleware = new CsrfOriginMiddleware();
    const next = jest.fn();

    middleware.use(
      buildRequest({ headers: { origin: 'https://cloud.marppa.com' } }),
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('falls back to Referer when Origin is missing', () => {
    process.env.CORS_URL = 'https://cloud.marppa.com';
    const middleware = new CsrfOriginMiddleware();
    const next = jest.fn();

    middleware.use(
      buildRequest({
        headers: { referer: 'https://cloud.marppa.com/workers/1' },
      }),
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('rejects mutating requests from a foreign Origin', () => {
    process.env.CORS_URL = 'https://cloud.marppa.com';
    const middleware = new CsrfOriginMiddleware();

    expect(() =>
      middleware.use(
        buildRequest({ headers: { origin: 'https://evil.example.com' } }),
        {} as any,
        jest.fn(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects mutating requests with no Origin/Referer at all', () => {
    process.env.CORS_URL = 'https://cloud.marppa.com';
    const middleware = new CsrfOriginMiddleware();

    expect(() =>
      middleware.use(buildRequest(), {} as any, jest.fn()),
    ).toThrow(ForbiddenException);
  });

  it('does not check non-mutating requests', () => {
    process.env.CORS_URL = 'https://cloud.marppa.com';
    const middleware = new CsrfOriginMiddleware();
    const next = jest.fn();

    middleware.use(
      buildRequest({ method: 'GET' }),
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('skips the check entirely when CORS_URL is not configured', () => {
    delete process.env.CORS_URL;
    const middleware = new CsrfOriginMiddleware();
    const next = jest.fn();

    middleware.use(buildRequest(), {} as any, next);

    expect(next).toHaveBeenCalled();
  });
});

import { ForbiddenException } from '@nestjs/common';
import { CsrfTokenMiddleware } from './csrf-token.middleware';

describe('CsrfTokenMiddleware', () => {
  const middleware = new CsrfTokenMiddleware();

  function buildRequest(overrides: Partial<Record<string, any>> = {}) {
    return {
      method: 'POST',
      cookies: {},
      headers: {},
      ...overrides,
    } as any;
  }

  it('allows a mutating request when the header matches the cookie', () => {
    const next = jest.fn();

    middleware.use(
      buildRequest({
        cookies: { csrf_token: 'abc123' },
        headers: { 'x-csrf-token': 'abc123' },
      }),
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('rejects a mutating request when the header does not match the cookie', () => {
    expect(() =>
      middleware.use(
        buildRequest({
          cookies: { csrf_token: 'abc123' },
          headers: { 'x-csrf-token': 'wrong' },
        }),
        {} as any,
        jest.fn(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects a mutating request with a csrf cookie but no header', () => {
    expect(() =>
      middleware.use(
        buildRequest({ cookies: { csrf_token: 'abc123' } }),
        {} as any,
        jest.fn(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('skips the check when there is no session (no csrf cookie yet)', () => {
    const next = jest.fn();

    middleware.use(buildRequest(), {} as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('does not check non-mutating requests', () => {
    const next = jest.fn();

    middleware.use(buildRequest({ method: 'GET' }), {} as any, next);

    expect(next).toHaveBeenCalled();
  });
});

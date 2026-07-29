import { UserRole } from '@marppa-cloud/db';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { NotFoundError } from '../errors/not-found.error';
import { authorize, can } from './authorize';

describe('authorize/can', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authorize throws UnauthorizedError with no session', () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue(null);

    expect(() => authorize('manage', 'Worker', 'c-1')).toThrow(UnauthorizedError);
  });

  it('authorize throws NotFoundError for a mismatched company', () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-1',
      companyId: 'c-1',
      role: UserRole.OWNER,
    } as any);

    expect(() => authorize('manage', 'Worker', 'c-other')).toThrow(NotFoundError);
  });

  it('authorize passes for a matching company', () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-1',
      companyId: 'c-1',
      role: UserRole.MEMBER,
    } as any);

    expect(() => authorize('manage', 'Worker', 'c-1')).not.toThrow();
  });

  it('can returns false with no session instead of throwing', () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue(null);

    expect(can('read', 'User', 'c-1')).toBe(false);
  });

  it('can returns true/false based on company match', () => {
    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-1',
      companyId: 'c-1',
      role: UserRole.MEMBER,
    } as any);

    expect(can('read', 'User', 'c-1')).toBe(true);
    expect(can('read', 'User', 'c-other')).toBe(false);
  });
});

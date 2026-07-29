import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { NotFoundError } from '../errors/not-found.error';
import { UnauthorizedError } from '../errors/unauthorized.error';

export function assertCompanyOwnership(ownerId: string): void {
  const user = getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  // Hide other companies' resources entirely rather than revealing they exist.
  if (ownerId !== user.companyId) {
    throw new NotFoundError();
  }
}

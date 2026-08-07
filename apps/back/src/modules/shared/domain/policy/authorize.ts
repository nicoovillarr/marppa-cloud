import {
  getCurrentUser,
  getManageableCompanyIds,
} from '@/auth/infrastructure/als/session.context';
import { NotFoundError } from '../errors/not-found.error';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { defineAbilityFor, policySubject, PolicyAction, PolicySubjectType } from './ability';

export function authorize(
  action: PolicyAction,
  subjectType: PolicySubjectType,
  ownerId: string,
): void {
  const user = getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  // Hide other companies' resources entirely rather than revealing they exist.
  if (!can(action, subjectType, ownerId)) {
    throw new NotFoundError();
  }
}

export function can(
  action: PolicyAction,
  subjectType: PolicySubjectType,
  ownerId: string,
): boolean {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }

  const manageable = getManageableCompanyIds();
  const ability = defineAbilityFor(
    user,
    manageable.length > 0 ? manageable : [user.companyId],
  );

  return ability.can(action, policySubject(subjectType, ownerId));
}

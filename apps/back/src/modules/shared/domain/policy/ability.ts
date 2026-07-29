import { AbilityBuilder, createMongoAbility, subject as toSubject } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import { UserRole } from '@marppa-cloud/db';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';

export type PolicyAction = 'read' | 'manage';

export type PolicySubjectType =
  | 'Worker'
  | 'Zone'
  | 'Atom'
  | 'Portal'
  | 'Event'
  | 'User'
  | 'Company'
  | 'SystemReset';

interface CompanyScoped {
  companyId: string;
}

export type AppAbility = MongoAbility<[PolicyAction, PolicySubjectType | CompanyScoped]>;

const OPERATIONAL_SUBJECTS: PolicySubjectType[] = [
  'Worker',
  'Zone',
  'Atom',
  'Portal',
  'Event',
  'User',
];

export function defineAbilityFor(user: JwtEntity): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can('manage', OPERATIONAL_SUBJECTS, { companyId: user.companyId });
  can('read', 'Company', { companyId: user.companyId });

  if (user.role === UserRole.OWNER) {
    can('manage', 'Company', { companyId: user.companyId });
    can('manage', 'SystemReset', { companyId: user.companyId });
  }

  return build();
}

export function policySubject(type: PolicySubjectType, companyId: string) {
  return toSubject(type, { companyId });
}

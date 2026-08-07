import { UserRole } from '@marppa-cloud/db';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { defineAbilityFor, policySubject } from './ability';

describe('defineAbilityFor', () => {
  const owner = new JwtEntity('u-1', 'owner@test.com', 'c-1', 'access', UserRole.OWNER);
  const member = new JwtEntity('u-2', 'member@test.com', 'c-1', 'access', UserRole.MEMBER);

  it('lets both OWNER and MEMBER manage operational resources in their own company', () => {
    for (const user of [owner, member]) {
      const ability = defineAbilityFor(user);

      expect(ability.can('manage', policySubject('Worker', 'c-1'))).toBe(true);
      expect(ability.can('read', policySubject('Worker', 'c-1'))).toBe(true);
      expect(ability.can('manage', policySubject('Zone', 'c-1'))).toBe(true);
      expect(ability.can('manage', policySubject('Atom', 'c-1'))).toBe(true);
      expect(ability.can('manage', policySubject('Portal', 'c-1'))).toBe(true);
      expect(ability.can('read', policySubject('Event', 'c-1'))).toBe(true);
      expect(ability.can('read', policySubject('User', 'c-1'))).toBe(true);
    }
  });

  it('denies access to another company resources for both roles', () => {
    for (const user of [owner, member]) {
      const ability = defineAbilityFor(user);

      expect(ability.can('manage', policySubject('Worker', 'c-other'))).toBe(false);
      expect(ability.can('read', policySubject('Company', 'c-other'))).toBe(false);
    }
  });

  it('lets a parent company manage operational resources of its descendants', () => {
    const ability = defineAbilityFor(owner, ['c-1', 'c-child']);

    expect(ability.can('manage', policySubject('Zone', 'c-child'))).toBe(true);
    expect(ability.can('manage', policySubject('Worker', 'c-child'))).toBe(true);
    expect(ability.can('manage', policySubject('Zone', 'c-unrelated'))).toBe(false);
  });

  it('keeps Company scoped to the user own company even with descendants', () => {
    const ability = defineAbilityFor(owner, ['c-1', 'c-child']);

    expect(ability.can('manage', policySubject('Company', 'c-child'))).toBe(false);
    expect(ability.can('read', policySubject('Company', 'c-child'))).toBe(false);
  });

  it('lets only OWNER manage their own Company', () => {
    expect(owner.role).toBe(UserRole.OWNER);
    const ownerAbility = defineAbilityFor(owner);
    const memberAbility = defineAbilityFor(member);

    expect(ownerAbility.can('manage', policySubject('Company', 'c-1'))).toBe(true);
    expect(memberAbility.can('manage', policySubject('Company', 'c-1'))).toBe(false);
  });

  it('lets both roles read their own Company', () => {
    const ownerAbility = defineAbilityFor(owner);
    const memberAbility = defineAbilityFor(member);

    expect(ownerAbility.can('read', policySubject('Company', 'c-1'))).toBe(true);
    expect(memberAbility.can('read', policySubject('Company', 'c-1'))).toBe(true);
  });

  it('lets only OWNER trigger a SystemReset for their own company', () => {
    const ownerAbility = defineAbilityFor(owner);
    const memberAbility = defineAbilityFor(member);

    expect(ownerAbility.can('manage', policySubject('SystemReset', 'c-1'))).toBe(true);
    expect(memberAbility.can('manage', policySubject('SystemReset', 'c-1'))).toBe(false);
  });
});

import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class AtomInvalidStatusError extends ForbiddenError {
  constructor(
    expected: ResourceStatus | ResourceStatus[],
    actual: ResourceStatus,
  ) {
    const allowed = Array.isArray(expected) ? expected.join(' or ') : expected;
    super(`Atom is not in ${allowed} status. Current status is ${actual}`);
  }
}

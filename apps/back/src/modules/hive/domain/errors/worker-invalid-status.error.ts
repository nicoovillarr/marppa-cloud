import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class WorkerInvalidStatusError extends ForbiddenError {
  constructor(
    expected: ResourceStatus | ResourceStatus[],
    actual: ResourceStatus,
  ) {
    const allowed = Array.isArray(expected) ? expected.join(' or ') : expected;
    super(`Worker is not in ${allowed} status. Current status is ${actual}`);
  }
}

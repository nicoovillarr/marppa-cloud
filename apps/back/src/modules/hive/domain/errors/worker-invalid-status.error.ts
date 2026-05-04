import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class WorkerInvalidStatusError extends ForbiddenError {
  constructor(expected: ResourceStatus, actual: ResourceStatus) {
    super(`Worker is not in ${expected} status. Current status is ${actual}`);
  }
}

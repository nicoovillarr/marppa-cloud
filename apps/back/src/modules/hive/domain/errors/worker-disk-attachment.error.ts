import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class WorkerDiskAlreadyAttachedError extends ForbiddenError {
  constructor(workerId: string) {
    super(`Volume is already attached to worker ${workerId}`);
  }
}

export class WorkerDiskStillAttachedError extends ForbiddenError {
  constructor(workerId: string) {
    super(`Volume is still attached to worker ${workerId}: detach it first`);
  }
}

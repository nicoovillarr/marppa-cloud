import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class WorkerDiskNoFreeSlotError extends ForbiddenError {
  constructor(workerId: string) {
    super(`Worker ${workerId} has no free volume slot left`);
  }
}

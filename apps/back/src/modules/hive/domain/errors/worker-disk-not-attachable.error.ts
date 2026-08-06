import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class WorkerDiskNotAttachableError extends ForbiddenError {
  constructor(storageTypeName: string) {
    super(`Storage type ${storageTypeName} cannot be attached to a worker`);
  }
}

import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class WorkerFamilyDeprecatedError extends ConflictError {
  constructor(name: string) {
    super(
      `Family "${name}" is deprecated: restore it before restoring any of its flavors`,
    );
  }
}

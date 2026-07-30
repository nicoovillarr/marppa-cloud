import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class WorkerFlavorDeprecatedError extends ConflictError {
  constructor(name: string) {
    super(
      `Flavor "${name}" is deprecated: it cannot be revised or used for new workers`,
    );
  }
}

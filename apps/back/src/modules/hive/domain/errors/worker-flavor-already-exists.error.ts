import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class WorkerFlavorAlreadyExistsError extends ConflictError {
  constructor(name: string) {
    super(
      `Flavor "${name}" already exists in this family: revise it instead of creating it again`,
    );
  }
}

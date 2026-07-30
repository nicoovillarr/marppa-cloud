import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class WorkerStorageTypeInUseError extends ConflictError {
  constructor(name: string, referenceCount: number) {
    super(
      `Storage type "${name}" is still referenced by ${referenceCount} image(s) or disk(s): repoint them before removing it`,
    );
  }
}

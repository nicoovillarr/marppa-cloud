import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class AtomSizeAlreadyExistsError extends ConflictError {
  constructor(name: string) {
    super(
      `Atom size "${name}" already exists: revise it instead of creating it again`,
    );
  }
}

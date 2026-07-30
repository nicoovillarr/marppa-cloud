import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class AtomSizeDeprecatedError extends ConflictError {
  constructor(name: string) {
    super(
      `Atom size "${name}" is deprecated: it cannot be revised or used for new atoms`,
    );
  }
}

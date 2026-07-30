import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class AtomImageInUseError extends ConflictError {
  constructor(name: string, atomCount: number) {
    super(
      `Atom image "${name}" still backs ${atomCount} atom(s): delete them before removing the image`,
    );
  }
}

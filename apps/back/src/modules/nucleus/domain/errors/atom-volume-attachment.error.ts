import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class AtomVolumeAlreadyAttachedError extends ForbiddenError {
  constructor(atomId: string) {
    super(`Volume is already attached to atom ${atomId}`);
  }
}

export class AtomVolumeStillAttachedError extends ForbiddenError {
  constructor(atomId: string) {
    super(`Volume is still attached to atom ${atomId}: detach it first`);
  }
}

export class AtomVolumeNotAttachedError extends ForbiddenError {
  constructor() {
    super('Volume is not attached to any atom');
  }
}

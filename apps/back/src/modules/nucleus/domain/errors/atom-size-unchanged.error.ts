import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class AtomSizeUnchangedError extends BadRequestError {
  constructor() {
    super('Atom already uses that size');
  }
}

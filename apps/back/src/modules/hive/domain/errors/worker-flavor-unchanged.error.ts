import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class WorkerFlavorUnchangedError extends BadRequestError {
  constructor() {
    super('Worker already uses that flavor');
  }
}

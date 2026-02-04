import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class InvalidEmailError extends BadRequestError {
  constructor() {
    super(`Invalid email format`);
  }
}

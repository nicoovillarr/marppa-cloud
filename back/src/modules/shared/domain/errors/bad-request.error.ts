import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class BadRequestError extends DomainError {
  public code: HttpStatus = HttpStatus.BAD_REQUEST;

  constructor(
    message: string = 'The request came in crooked. Straighten it out and try again.',

  ) {
    super(message);
  }
}

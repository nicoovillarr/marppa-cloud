import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class NotAcceptableError extends DomainError {
  public code: HttpStatus = HttpStatus.NOT_ACCEPTABLE;

  constructor(
    message: string = "The server doesn't like what you asked for at all.",

  ) {
    super(message);
  }
}

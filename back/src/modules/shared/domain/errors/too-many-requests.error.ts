import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class TooManyRequestsError extends DomainError {
  public code: HttpStatus = HttpStatus.TOO_MANY_REQUESTS;

  constructor(
    message: string = 'Too many requests. Are you okay? Do you need to talk to someone?',
  ) {
    super(message);
  }
}

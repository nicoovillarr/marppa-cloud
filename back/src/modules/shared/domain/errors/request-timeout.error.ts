import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class RequestTimeoutError extends DomainError {
  public code: HttpStatus = HttpStatus.REQUEST_TIMEOUT;

  constructor(
    message: string = 'You fell asleep. The server got bored and left.',

  ) {
    super(message);
  }
}

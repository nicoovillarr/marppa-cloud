import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class ServiceUnavailableError extends DomainError {
  public code: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE;

  constructor(
    message: string = 'A third party fell over. Not my fault. Try again later.',
  ) {
    super(message);
  }
}

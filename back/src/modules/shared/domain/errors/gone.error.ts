import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class GoneError extends DomainError {
  public code: HttpStatus = HttpStatus.GONE;

  constructor(message: string = "That's no longer here. It was, it passed, it died.") {
    super(message);
  }
}

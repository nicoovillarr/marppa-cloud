import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class ConflictError extends DomainError {
  public code: HttpStatus = HttpStatus.CONFLICT;

  constructor(message: string = 'Something crashed into something.') {
    super(message);
  }
}

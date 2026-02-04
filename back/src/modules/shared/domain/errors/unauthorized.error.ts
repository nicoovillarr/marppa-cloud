import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class UnauthorizedError extends DomainError {
  public code: HttpStatus = HttpStatus.UNAUTHORIZED;

  constructor(
    message: string = 'Permission denied. The system says no. So do I.',

  ) {
    super(message);
  }
}

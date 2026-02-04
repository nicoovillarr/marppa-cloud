import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class ForbiddenError extends DomainError {
  public code: HttpStatus = HttpStatus.FORBIDDEN;

  constructor(
    message: string = "Access forbidden. Trying to insist won't make you any more authorized.",

  ) {
    super(message);
  }
}

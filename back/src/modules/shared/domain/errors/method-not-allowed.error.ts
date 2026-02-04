import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class MethodNotAllowedError extends DomainError {
  public code: HttpStatus = HttpStatus.METHOD_NOT_ALLOWED;

  constructor(
    message: string = "It's not done like that. Try a method that doesn't bring shame.",

  ) {
    super(message);
  }
}

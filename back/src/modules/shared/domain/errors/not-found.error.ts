import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class NotFoundError extends DomainError {
  public code: HttpStatus = HttpStatus.NOT_FOUND;

  constructor(
    message: string = "I didn't find it. Maybe it never existed. Maybe you dreamt it.",

  ) {
    super(message);
  }
}

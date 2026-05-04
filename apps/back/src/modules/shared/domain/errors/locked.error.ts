import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class LockedError extends DomainError {
  public code: HttpStatus = HttpStatus.LOCKED;

  constructor(message: string = 'Locked with a padlock.') {
    super(message);
  }
}

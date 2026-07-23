import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class InvalidCaptchaError extends DomainError {
  public code: HttpStatus = HttpStatus.FORBIDDEN;

  constructor(
    message: string = 'Captcha inválido. Probá de nuevo, robot.',
  ) {
    super(message);
  }
}

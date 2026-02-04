import { HttpStatus } from '@nestjs/common';

import { DomainError } from '@/shared/domain/errors/domain.error';

export class PaymentRequiredError extends DomainError {
  public code: HttpStatus = HttpStatus.PAYMENT_REQUIRED;

  constructor(
    message: string = 'We missed the part where you paid. Minor detail, right?',

  ) {
    super(message);
  }
}

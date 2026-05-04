import { HttpStatus } from '@nestjs/common';

export abstract class DomainError extends Error {
  abstract code: HttpStatus;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

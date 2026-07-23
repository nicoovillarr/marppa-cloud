import { NotAcceptableError } from '@/shared/domain/errors/not-acceptable.error';

export class InvalidCredentialsError extends NotAcceptableError {
  constructor() {
    super('Invalid credentials');
  }
}

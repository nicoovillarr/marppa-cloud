import { DomainError } from '@/shared/domain/errors/domain.error';

export class InvalidTokenError extends DomainError {
  public code: number = 498;

  constructor(
    message: string = "Invalid token. I don't know whose that is, but it's not yours.",
  ) {
    super(message);
  }
}

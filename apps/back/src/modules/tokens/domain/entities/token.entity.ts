import { BaseEntity } from '@/shared/domain/entities/base.entity';
import type { TokenType } from '../enums/token-types.enum';

interface TokenOptionalProps {
  expiresAt?: Date;
}

const DEFAULT_TTL_MINUTES = 15;

export class TokenEntity extends BaseEntity {
  public readonly expiresAt: Date;

  constructor(
    public readonly token: string,
    public readonly type: TokenType,
    public readonly userId: string,
    optionals: TokenOptionalProps = {},
  ) {
    super();

    this.expiresAt =
      optionals.expiresAt ??
      new Date(Date.now() + DEFAULT_TTL_MINUTES * 60 * 1000);
  }

  toObject(): Record<string, any> {
    return {
      token: this.token,
      type: this.type,
      userId: this.userId,
      expiresAt: this.expiresAt,
    };
  }
}

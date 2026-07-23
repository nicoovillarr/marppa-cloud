import type { TokenEntity } from '../entities/token.entity';

export const TOKEN_REPOSITORY_SYMBOL = Symbol('TOKEN_REPOSITORY');

export abstract class TokenRepository {
  abstract create(token: TokenEntity): Promise<void>;
  abstract delete(token: string): Promise<void>;
  abstract findByToken(token: string): Promise<TokenEntity | null>;
}

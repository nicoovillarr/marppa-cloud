import { Inject, Injectable } from '@nestjs/common';

import { InvalidTokenError } from '@/shared/domain/errors/invalid-token.error';
import {
  TOKEN_REPOSITORY_SYMBOL,
  type TokenRepository,
} from '../repositories/token.repository';
import { TokenType } from '../enums/token-types.enum';
import { TokenEntity } from '../entities/token.entity';

@Injectable()
export class TokenService {
  constructor(
    @Inject(TOKEN_REPOSITORY_SYMBOL)
    private readonly tokenRepository: TokenRepository,
  ) {}

  async create(
    type: TokenType,
    userId: string,
    expiresAt?: Date,
  ): Promise<TokenEntity> {
    const token = crypto.randomUUID();
    const entity = new TokenEntity(token, type, userId, { expiresAt });
    await this.tokenRepository.create(entity);

    return entity;
  }

  async consume(token: string, type: TokenType): Promise<TokenEntity> {
    const entity = await this.findByToken(token);
    if (entity.type !== type) {
      throw new InvalidTokenError();
    }

    await this.tokenRepository.delete(token);
    return entity;
  }

  private async findByToken(token: string): Promise<TokenEntity> {
    const entity = await this.tokenRepository.findByToken(token);
    if (entity == null || entity.expiresAt.getTime() < Date.now()) {
      throw new InvalidTokenError();
    }

    return entity;
  }
}

import type { Prisma, Token } from '@prisma/client';

import { TokenEntity } from '@/tokens/domain/entities/token.entity';
import type { TokenType } from '@/tokens/domain/enums/token-types.enum';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

export class TokenPrismaMapper {
  static toEntity(raw: Token): TokenEntity {
    return new TokenEntity(raw.token, raw.type as TokenType, raw.userId, {
      expiresAt: raw.expiresAt,
    });
  }

  static toCreate(entity: TokenEntity): Prisma.TokenCreateInput {
    return PrismaMapper.toCreate(entity) as Prisma.TokenCreateInput;
  }
}

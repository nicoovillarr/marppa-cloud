import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { TokenRepository } from '@/tokens/domain/repositories/token.repository';
import { TokenEntity } from '@/tokens/domain/entities/token.entity';
import { TokenPrismaMapper } from '../mappers/token.prisma-mapper';

@Injectable()
export class TokenPrismaRepository implements TokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entity: TokenEntity): Promise<void> {
    await this.prisma.token.create({
      data: TokenPrismaMapper.toCreate(entity),
    });
  }

  async delete(token: string): Promise<void> {
    await this.prisma.token.delete({
      where: { token },
    });
  }

  async findByToken(token: string): Promise<TokenEntity | null> {
    const entity = await this.prisma.token.findUnique({
      where: { token },
    });

    if (!entity) {
      return null;
    }

    return TokenPrismaMapper.toEntity(entity);
  }
}

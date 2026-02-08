import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';

import { SessionEntity } from '@/auth/domain/entities/session.entity';
import { AuthRepository } from '@/auth/domain/repositories/auth.repository';
import { SessionPrismaMapper } from '@/auth/infrastructure/mappers/session-prisma.mapper';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class AuthPrismaRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) { }

  async createSession(entity: SessionEntity): Promise<SessionEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const session: Session = await this.prisma.session.create({
      data: sanitized,
    });

    return SessionPrismaMapper.toEntity(session);
  }

  async deleteSessionByRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshToken: refreshToken },
      data: { expiredAt: new Date() },
    });
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<SessionEntity | null> {
    const session: Session | null = await this.prisma.session.findFirst({
      where: {
        refreshToken: refreshToken,
        expiredAt: null,
      },
    });
    if (!session) return null;

    return SessionPrismaMapper.toEntity(session);
  }
}

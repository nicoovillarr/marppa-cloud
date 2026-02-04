import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';

import { SessionEntity } from '@/auth/domain/entities/session.entity';
import { AuthRepository } from '@/auth/domain/repositories/auth.repository';
import { SessionPrismaMapper } from '@/auth/infrastructure/mappers/session-prisma.mapper';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';

@Injectable()
export class AuthPrismaRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) { }

  async createSession(session: SessionEntity): Promise<SessionEntity> {
    const createdSession: Session = await this.prisma.session.create({
      data: {
        refreshToken: session.refreshToken,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        platform: session.platform,
        device: session.device,
        browser: session.browser,
        expiredAt: session.expiredAt,
      },
    });

    return SessionPrismaMapper.toEntity(createdSession);
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

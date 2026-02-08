import { Session } from '@prisma/client';

import { SessionEntity } from '@/auth/domain/entities/session.entity';

export class SessionPrismaMapper {
  static toEntity(session: Session): SessionEntity {
    return new SessionEntity(
      session.userId,
      session.ipAddress,
      session.userAgent,
      session.platform,
      session.device,
      session.browser,
      {
        refreshToken: session.refreshToken ?? undefined,
        createdAt: session.createdAt ?? undefined,
        expiredAt: session.expiredAt ?? undefined,
      },
    );
  }
}

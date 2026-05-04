import { SessionEntity } from '@/auth/domain/entities/session.entity';

export const AUTH_REPOSITORY_SYMBOL = Symbol('AUTH_REPOSITORY');

export abstract class AuthRepository {
  abstract createSession(session: SessionEntity): Promise<SessionEntity>;
  abstract deleteSessionByRefreshToken(refreshToken: string): Promise<void>;
  abstract findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<SessionEntity | null>;
}

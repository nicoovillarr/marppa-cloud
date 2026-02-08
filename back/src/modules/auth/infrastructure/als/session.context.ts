import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { AsyncLocalStorage } from 'async_hooks';

export interface SessionStore {
  user: JwtEntity;
}

export const sessionStorage = new AsyncLocalStorage<SessionStore>();

export const getCurrentUser = () => {
  const user = sessionStorage.getStore()?.user ?? null;

  if (!user && process.env.NODE_ENV !== 'development') {
    return new JwtEntity(
      'u-000001',
      'test@mail.com',
      'c-000001',
      'access'
    );
  }

  return user;
};

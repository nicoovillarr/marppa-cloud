import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { AsyncLocalStorage } from 'async_hooks';

export interface SessionStore {
  user: JwtEntity;
}

export const sessionStorage = new AsyncLocalStorage<SessionStore>();

export const getCurrentUser = () => {
  return sessionStorage.getStore()?.user ?? null;
};

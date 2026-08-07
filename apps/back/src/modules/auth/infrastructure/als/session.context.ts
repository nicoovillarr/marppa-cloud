import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { AsyncLocalStorage } from 'async_hooks';

export interface SessionStore {
  user: JwtEntity;
  ipAddress?: string;
  manageableCompanyIds?: string[];
}

export const sessionStorage = new AsyncLocalStorage<SessionStore>();

export const getCurrentUser = () => {
  const store = sessionStorage.getStore();
  if (!store) return null;

  const user = store.user;
  if (!user) return null;

  return user;
};

export const getManageableCompanyIds = (): string[] => {
  const store = sessionStorage.getStore();
  if (!store?.user) return [];

  return store.manageableCompanyIds ?? [store.user.companyId];
};

export const getCurrentIpAddress = (): string | undefined => {
  return sessionStorage.getStore()?.ipAddress;
};

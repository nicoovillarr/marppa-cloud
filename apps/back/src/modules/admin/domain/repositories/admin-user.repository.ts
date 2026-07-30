import { UserRole } from '@marppa-cloud/db';
import { AdminUserModel } from '../models/admin-user.model';

export const ADMIN_USER_REPOSITORY_SYMBOL = Symbol('ADMIN_USER_REPOSITORY');

export interface AdminUserWrite {
  name?: string;
  email?: string;
  role?: UserRole;
  companyId?: string;
}

export abstract class AdminUserRepository {
  abstract findAll(): Promise<AdminUserModel[]>;
  abstract findById(id: string): Promise<AdminUserModel | null>;
  abstract update(id: string, data: AdminUserWrite): Promise<AdminUserModel>;
  abstract delete(id: string): Promise<void>;
  abstract countOwners(companyId: string): Promise<number>;
  abstract revokeSessions(userId: string): Promise<void>;
}

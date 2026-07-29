import { UserRole } from '@marppa-cloud/db';
import { UserEntity } from '@/user/domain/entities/user.entity';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export function toUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id!,
    email: user.email,
    name: user.name,
    companyId: user.companyId,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

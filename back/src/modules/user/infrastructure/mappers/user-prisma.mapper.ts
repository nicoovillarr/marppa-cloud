import { User } from '@prisma/client';

import { UserEntity } from '@/user/domain/entities/user.entity';

export class UserPrismaMapper {
  static toEntity(user: User): UserEntity {
    return new UserEntity(
      user.email,
      user.password,
      user.name,
      {
        id: user.id,
        companyId: user.companyId ?? undefined,
        createdAt: user.createdAt ?? undefined,
        updatedAt: user.updatedAt ?? undefined,
      },
    );
  }
}

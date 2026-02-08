import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';

import { UserEntity } from '@/user/domain/entities/user.entity';
import { UserRepository } from '@/user/domain/repositories/user.reposity';
import { UserPrismaMapper } from '@/user/infrastructure/mappers/user-prisma.mapper';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findUserById(userId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return UserPrismaMapper.toEntity(user);
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return UserPrismaMapper.toEntity(user);
  }

  async createUser(entity: UserEntity): Promise<UserEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const user: User = await this.prisma.user.create({
      data: sanitized,
    });

    return UserPrismaMapper.toEntity(user);
  }

  async updateUser(entity: UserEntity): Promise<UserEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const user: User = await this.prisma.user.update({
      where: { id: entity.id! },
      data: sanitized,
    });

    return UserPrismaMapper.toEntity(user);
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }
}

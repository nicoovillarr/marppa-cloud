import { UserEntity } from '@/user/domain/entities/user.entity';

export const USER_REPOSITORY_SYMBOL = Symbol('USER_REPOSITORY');

export abstract class UserRepository {
  abstract findUserById(userId: string): Promise<UserEntity | null>;
  abstract findUserByEmail(email: string): Promise<UserEntity | null>;
  abstract emailExists(email: string): Promise<boolean>;
  abstract createUser(userData: UserEntity): Promise<UserEntity>;
  abstract updateUser(userData: UserEntity): Promise<UserEntity>;
}

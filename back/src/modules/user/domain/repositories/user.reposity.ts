import { UserEntity } from '@/user/domain/entities/user.entity';

export const USER_REPOSITORY_SYMBOL = Symbol('USER_REPOSITORY');

export abstract class UserRepository {
  abstract createUser(userData: UserEntity): Promise<UserEntity>;
  abstract updateUser(userData: UserEntity): Promise<UserEntity>;
  abstract findUserById(userId: string): Promise<UserEntity | null>;
  abstract emailExists(email: string): Promise<boolean>;
  abstract findUserByEmail(email: string): Promise<UserEntity | null>;
}

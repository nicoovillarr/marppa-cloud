import { Inject, Injectable } from '@nestjs/common';

import { PASSWORD_HASHER_SYMBOL } from '@/user/domain/services/password-hasher.service';
import { type PasswordHasher } from '@/user/domain/services/password-hasher.service';

import { UserEntity } from '@/user/domain/entities/user.entity';
import { USER_REPOSITORY_SYMBOL } from '@/user/domain/repositories/user.reposity';
import { type UserRepository } from '@/user/domain/repositories/user.reposity';
import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { InvalidEmailError } from '../errors/invalid-email.error';
import { EmailConflictError } from '../errors/email-conflict.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_SYMBOL)
    private readonly userRepository: UserRepository,

    @Inject(PASSWORD_HASHER_SYMBOL)
    private readonly passwordHasher: PasswordHasher,
  ) { }

  async createUser(data: CreateUserDto) {
    const { email, password, name, companyId } = data;
    const emailLower = email.toLowerCase();

    if (!this.isValidEmail(emailLower)) {
      throw new InvalidEmailError();
    }

    const emailInUse = await this.emailExists(emailLower);
    if (emailInUse) {
      throw new EmailConflictError();
    }

    const hash = await this.passwordHasher.hash(password);

    const userEntity = new UserEntity(emailLower, hash, name, companyId);

    return await this.saveUser(userEntity);
  }

  async saveUser(userEntity: UserEntity): Promise<UserEntity> {
    if (userEntity.id == null) {
      return await this.userRepository.createUser(userEntity);
    } else {
      return await this.userRepository.updateUser(userEntity);
    }
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  async emailExists(email: string): Promise<boolean> {
    return await this.userRepository.emailExists(email);
  }

  async findCurrentUser(): Promise<UserEntity | null> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    return await this.userRepository.findUserById(user.userId);
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return await this.userRepository.findUserById(userId);
  }

  async findUserByEmail(email: string): Promise<UserEntity> {
    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    return user;
  }

  async comparePassword(plain: string, hashed: string): Promise<boolean> {
    const isPasswordValid = await this.passwordHasher.verify(plain, hashed);
    return isPasswordValid;
  }
}

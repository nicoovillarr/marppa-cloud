import { forwardRef, Module } from '@nestjs/common';

import { SharedModule } from '@/shared/shared.module';

import { UserApiService } from '@/user/application/user-api.service';
import { PASSWORD_HASHER_SYMBOL } from '@/user/domain/services/password-hasher.service';
import { Argon2PasswordHasherService } from '@/user/infrastructure/services/argon2-pashword-hasher.service';
import { UserService } from '@/user/domain/services/user.service';
import { USER_REPOSITORY_SYMBOL } from '@/user/domain/repositories/user.reposity';
import { UserPrismaRepository } from '@/user/infrastructure/repositories/user-prisma.repository';
import { UserController } from '@/user/presentation/controllers/user.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [
    UserApiService,
    UserService,

    {
      provide: PASSWORD_HASHER_SYMBOL,
      useClass: Argon2PasswordHasherService,
    },

    {
      provide: USER_REPOSITORY_SYMBOL,
      useClass: UserPrismaRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule { }

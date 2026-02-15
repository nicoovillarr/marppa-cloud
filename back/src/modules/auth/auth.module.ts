import { forwardRef, Module } from '@nestjs/common';

import { SharedModule } from '@/shared/shared.module';

import { AuthApiService } from '@/auth/application/services/auth.api-service';
import { AUTH_REPOSITORY_SYMBOL } from '@/auth/domain/repositories/auth.repository';
import { TOKEN_GENERATOR_SYMBOL } from '@/auth/domain/services/token-generator.service';
import { AuthCache } from '@/auth/infrastructure/cache/auth.cache';
import { AuthService } from '@/auth/domain/services/auth.service';
import { JwtTokenGenerator } from '@/auth/infrastructure/services/jwt-token-generator.service';
import { AuthPrismaRepository } from '@/auth/infrastructure/repositories/auth.prisma-repository';
import { AuthController } from '@/auth/presentation/controllers/auth.controller';
import { LoggedInGuard } from '@/auth/presentation/guards/logged-in.guard';
import { AuthMiddleware } from '@/auth/presentation/middlewares/auth.middleware';

import { UserModule } from '@/user/user.module';
import { TOKEN_STORAGE_SERVICE_SYMBOL } from './domain/services/token-storage.service';
import { CookiesTokenStorageService } from './infrastructure/services/cookies-token-storage.service';

@Module({
  imports: [SharedModule, forwardRef(() => UserModule)],
  controllers: [AuthController],
  providers: [
    LoggedInGuard,
    AuthMiddleware,
    AuthApiService,
    AuthService,
    AuthCache,

    {
      provide: TOKEN_GENERATOR_SYMBOL,
      useClass: JwtTokenGenerator,
    },

    {
      provide: AUTH_REPOSITORY_SYMBOL,
      useClass: AuthPrismaRepository,
    },

    {
      provide: TOKEN_STORAGE_SERVICE_SYMBOL,
      useClass: CookiesTokenStorageService,
    },
  ],
  exports: [LoggedInGuard, AuthService, TOKEN_GENERATOR_SYMBOL],
})
export class AuthModule {}

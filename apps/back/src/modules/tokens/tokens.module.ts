import { Module } from '@nestjs/common';

import { SharedModule } from '@/shared/shared.module';
import { TokenService } from './domain/services/token.service';
import { TOKEN_REPOSITORY_SYMBOL } from './domain/repositories/token.repository';
import { TokenPrismaRepository } from './infrastructure/repositories/token.prisma-repository';

@Module({
  imports: [SharedModule],
  providers: [
    TokenService,
    {
      provide: TOKEN_REPOSITORY_SYMBOL,
      useClass: TokenPrismaRepository,
    },
  ],
  exports: [TokenService],
})
export class TokensModule {}

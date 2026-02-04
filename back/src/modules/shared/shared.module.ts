import { Module } from '@nestjs/common';
import { CACHE_STORAGE_SYMBOL } from '@/shared/domain/services/cache.service';
import { RedisCacheService } from '@/shared/infrastructure/services/redis-cache.service';
import { InMemoryCacheService } from '@/shared/infrastructure/services/in-memory-cache.service';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    PrismaService,

    {
      provide: CACHE_STORAGE_SYMBOL,
      useClass:
        process.env.NODE_ENV === 'production'
          ? RedisCacheService
          : InMemoryCacheService,
    },
  ],
  exports: [PrismaService, CACHE_STORAGE_SYMBOL],
})
export class SharedModule {}

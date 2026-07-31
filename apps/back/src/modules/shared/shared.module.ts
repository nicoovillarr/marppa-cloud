import { Module } from '@nestjs/common';
import { CACHE_STORAGE_SYMBOL } from '@/shared/domain/services/cache.service';
import { ValkeyCacheService } from '@/shared/infrastructure/services/valkey-cache.service';
import { InMemoryCacheService } from '@/shared/infrastructure/services/in-memory-cache.service';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { ValkeyProvider } from './infrastructure/providers/valkey.provider';
import { RedisQueueProvider } from './infrastructure/providers/redis-queue.provider';
import { EventQueueService } from './infrastructure/services/event-queue.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { HOST_CAPACITY_REPOSITORY_SYMBOL } from '@/shared/domain/repositories/host-capacity.repository';
import { HostCapacityPrismaRepository } from './infrastructure/repositories/host-capacity.prisma-repository';
import { COMMITTED_RESOURCES_REPOSITORY_SYMBOL } from '@/shared/domain/repositories/committed-resources.repository';
import { CommittedResourcesPrismaRepository } from './infrastructure/repositories/committed-resources.prisma-repository';
import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';
import { PLATFORM_ADMIN_REPOSITORY_SYMBOL } from '@/shared/domain/repositories/platform-admin.repository';
import { PlatformAdminPrismaRepository } from './infrastructure/repositories/platform-admin.prisma-repository';
import { PlatformAdminGuard } from './presentation/guards/platform-admin.guard';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { COMPANY_HIERARCHY_REPOSITORY_SYMBOL } from '@/shared/domain/repositories/company-hierarchy.repository';
import { CompanyHierarchyPrismaRepository } from './infrastructure/repositories/company-hierarchy.prisma-repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    PrismaService,
    ValkeyProvider,
    RedisQueueProvider,
    EventQueueService,

    HostCapacityService,
    {
      provide: HOST_CAPACITY_REPOSITORY_SYMBOL,
      useClass: HostCapacityPrismaRepository,
    },
    {
      provide: COMMITTED_RESOURCES_REPOSITORY_SYMBOL,
      useClass: CommittedResourcesPrismaRepository,
    },

    PlatformAdminService,
    PlatformAdminGuard,
    {
      provide: PLATFORM_ADMIN_REPOSITORY_SYMBOL,
      useClass: PlatformAdminPrismaRepository,
    },

    CompanyHierarchyService,
    {
      provide: COMPANY_HIERARCHY_REPOSITORY_SYMBOL,
      useClass: CompanyHierarchyPrismaRepository,
    },

    {
      provide: CACHE_STORAGE_SYMBOL,
      useClass:
        process.env.NODE_ENV === 'production'
          ? ValkeyCacheService
          : InMemoryCacheService,
    },
  ],
  exports: [
    PrismaService,
    CACHE_STORAGE_SYMBOL,
    EventQueueService,
    HostCapacityService,
    PlatformAdminService,
    PlatformAdminGuard,
    CompanyHierarchyService,
  ],
})
export class SharedModule { }

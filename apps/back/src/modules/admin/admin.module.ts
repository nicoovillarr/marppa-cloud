import { Module } from '@nestjs/common';

import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { EventModule } from '@/event/event.module';

import { AdminApiService } from './application/services/admin.api-service';
import { AdminCompanyService } from './domain/services/admin-company.service';
import { AdminUserService } from './domain/services/admin-user.service';
import { AdminHostCapacityService } from './domain/services/admin-host-capacity.service';
import { AdminResourceService } from './domain/services/admin-resource.service';
import { ADMIN_COMPANY_REPOSITORY_SYMBOL } from './domain/repositories/admin-company.repository';
import { ADMIN_USER_REPOSITORY_SYMBOL } from './domain/repositories/admin-user.repository';
import { ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL } from './domain/repositories/admin-host-capacity.repository';
import { ADMIN_RESOURCE_REPOSITORY_SYMBOL } from './domain/repositories/admin-resource.repository';
import { AdminCompanyPrismaRepository } from './infrastructure/repositories/admin-company.prisma-repository';
import { AdminUserPrismaRepository } from './infrastructure/repositories/admin-user.prisma-repository';
import { AdminHostCapacityPrismaRepository } from './infrastructure/repositories/admin-host-capacity.prisma-repository';
import { AdminResourcePrismaRepository } from './infrastructure/repositories/admin-resource.prisma-repository';
import { AdminCompanyController } from './presentation/controllers/admin-company.controller';
import { AdminUserController } from './presentation/controllers/admin-user.controller';
import { AdminHostCapacityController } from './presentation/controllers/admin-host-capacity.controller';
import { AdminResourceController } from './presentation/controllers/admin-resource.controller';

@Module({
  imports: [SharedModule, AuthModule, UserModule, EventModule],
  controllers: [
    AdminCompanyController,
    AdminUserController,
    AdminHostCapacityController,
    AdminResourceController,
  ],
  providers: [
    AdminApiService,

    AdminCompanyService,
    {
      provide: ADMIN_COMPANY_REPOSITORY_SYMBOL,
      useClass: AdminCompanyPrismaRepository,
    },

    AdminUserService,
    {
      provide: ADMIN_USER_REPOSITORY_SYMBOL,
      useClass: AdminUserPrismaRepository,
    },

    AdminHostCapacityService,
    {
      provide: ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL,
      useClass: AdminHostCapacityPrismaRepository,
    },

    AdminResourceService,
    {
      provide: ADMIN_RESOURCE_REPOSITORY_SYMBOL,
      useClass: AdminResourcePrismaRepository,
    },
  ],
})
export class AdminModule { }

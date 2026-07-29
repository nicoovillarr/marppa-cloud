import { MiddlewareConsumer, Module } from '@nestjs/common';

import { AuthMiddleware } from '@/auth/presentation/middlewares/auth.middleware';
import { CsrfTokenMiddleware } from '@/shared/infrastructure/http/csrf-token.middleware';

import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { CompanyModule } from '@/company/company.module';
import { EventModule } from '@/event/event.module';
import { HiveModule } from '@/hive/hive.module';
import { MeshModule } from '@/mesh/mesh.module';
import { NucleusModule } from '@/nucleus/nucleus.module';
import { OrbitModule } from '@/orbit/orbit.module';
import { SystemModule } from '@/system/system.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '@/auth/presentation/guards/roles.guard';
import { CompanyRateLimitGuard } from '@/shared/infrastructure/http/company-rate-limit.guard';

const env = process.env.NODE_ENV ?? 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${env}.local`,
        '.env.local',
        `.env.${env}`,
        '.env',
      ],
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    SharedModule,
    AuthModule,
    UserModule,
    CompanyModule,
    EventModule,
    HiveModule,
    MeshModule,
    NucleusModule,
    OrbitModule,
    SystemModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CompanyRateLimitGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfTokenMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}

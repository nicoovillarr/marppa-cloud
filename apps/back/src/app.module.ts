import { MiddlewareConsumer, Module } from '@nestjs/common';

import { AuthMiddleware } from '@/auth/presentation/middlewares/auth.middleware';
import { CsrfOriginMiddleware } from '@/shared/infrastructure/http/csrf-origin.middleware';

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
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfOriginMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}

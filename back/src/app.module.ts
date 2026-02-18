import { MiddlewareConsumer, Module } from '@nestjs/common';

import { AuthMiddleware } from '@/auth/presentation/middlewares/auth.middleware';

import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { CompanyModule } from '@/company/company.module';
import { EventModule } from '@/event/event.module';
import { HiveModule } from '@/hive/hive.module';
import { MeshModule } from '@/mesh/mesh.module';
import { OrbitModule } from '@/orbit/orbit.module';
import { ConfigModule } from '@nestjs/config';

const env = process.env.NODE_ENV;
const envFilePath =
  env === 'development'
    ? '.env'
    : `.env.${env}`;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
    }),

    SharedModule,
    AuthModule,
    UserModule,
    CompanyModule,
    EventModule,
    HiveModule,
    MeshModule,
    OrbitModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('*');
  }
}

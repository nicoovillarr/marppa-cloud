import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { CompanyModule } from '@/company/company.module';
import { EventModule } from '@/event/event.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    UserModule,
    CompanyModule,
    EventModule,
  ],
})
export class AppModule { }

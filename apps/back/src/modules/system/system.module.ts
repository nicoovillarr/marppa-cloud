import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { EventModule } from '@/event/event.module';
import { CompanyModule } from '@/company/company.module';
import { SystemController } from './presentation/controllers/system.controller';
import { SystemApiService } from './application/services/system.api-service';

@Module({
  imports: [SharedModule, AuthModule, EventModule, CompanyModule],
  controllers: [SystemController],
  providers: [SystemApiService],
})
export class SystemModule {}

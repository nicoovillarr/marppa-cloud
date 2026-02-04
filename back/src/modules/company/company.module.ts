import { Module } from "@nestjs/common";
import { CompanyService } from "./domain/services/company.service";
import { COMPANY_REPOSITORY_SYMBOL } from "./domain/repositories/company.repository";
import { CompanyPrismaService } from "./infrastructure/repositories/company-prisma.service";
import { CompanyApiService } from "./application/services/company-api.service";
import { CompanyController } from "./presentation/controllers/company.controller";
import { SharedModule } from "@/shared/shared.module";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    CompanyApiService,

    {
      provide: COMPANY_REPOSITORY_SYMBOL,
      useClass: CompanyPrismaService
    },
  ],
  exports: [CompanyApiService]
})
export class CompanyModule { }

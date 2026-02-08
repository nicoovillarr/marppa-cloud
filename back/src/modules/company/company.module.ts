import { Module } from "@nestjs/common";
import { CompanyService } from "./domain/services/company.service";
import { COMPANY_REPOSITORY_SYMBOL } from "./domain/repositories/company.repository";
import { CompanyPrismaRepository } from "./infrastructure/repositories/company-prisma.repository";
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
      useClass: CompanyPrismaRepository
    },
  ],
  exports: [CompanyApiService]
})
export class CompanyModule { }

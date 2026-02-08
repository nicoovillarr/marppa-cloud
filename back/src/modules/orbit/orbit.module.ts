import { AuthModule } from "@/auth/auth.module";
import { SharedModule } from "@/shared/shared.module";
import { Module } from "@nestjs/common";
import { PortalController } from "./presentation/controllers/portal.controller";
import { TransponderController } from "./presentation/controllers/transponder.controller";
import { PortalService } from "./domain/services/portal.service";
import { PORTAL_REPOSITORY } from "./domain/repositories/portal.repository";
import { PortalPrismaRepository } from "./infrastructure/repositories/portal.prisma-repository";
import { PortalApiService } from "./application/services/portal.api-service";
import { TransponderApiService } from "./application/services/transponder.api-service";
import { TransponderService } from "./domain/services/transponder.service";
import { TransponderPrismaRepository } from "./infrastructure/repositories/transponder.prisma-repository";
import { TRANSPONDER_REPOSITORY } from "./domain/repositories/transponder.repository";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [PortalController, TransponderController],
  providers: [
    PortalApiService,
    PortalService,
    {
      provide: PORTAL_REPOSITORY,
      useClass: PortalPrismaRepository,
    },

    TransponderApiService,
    TransponderService,
    {
      provide: TRANSPONDER_REPOSITORY,
      useClass: TransponderPrismaRepository,
    },
  ],
})
export class OrbitModule { }
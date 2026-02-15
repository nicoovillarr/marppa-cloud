import { AuthModule } from '@/auth/auth.module';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { ZoneController } from './presentation/controllers/zone.controller';
import { FiberController } from './presentation/controllers/fiber.controller';
import { ZoneApiService } from './application/services/zone.api-service';
import { ZoneService } from './domain/services/zone.service';
import { ZonePrismaRepository } from './infrastructure/repositories/zone.prisma-repository';
import { ZONE_REPOSITORY_SYMBOL } from './domain/repositories/zone.repository';
import { NodeController } from './presentation/controllers/node.controller';
import { NodeApiService } from './application/services/node.api-service';
import { NODE_REPOSITORY_SYMBOL } from './domain/repositories/node.repository';
import { NodeService } from './domain/services/node.service';
import { NodePrismaRepository } from './infrastructure/repositories/node.prisma-repository';
import { FiberApiService } from './application/services/fiber.api-service';
import { FIBER_REPOSITORY_SYMBOL } from './domain/repositories/fiber.repository';
import { FiberService } from './domain/services/fiber.service';
import { FiberPrismaRepository } from './infrastructure/repositories/fiber.prisma-repository';
import { NetmaskService } from './domain/services/netmask.service';
import { EventModule } from '@/event/event.module';

@Module({
  imports: [SharedModule, AuthModule, EventModule],
  controllers: [ZoneController, NodeController, FiberController],
  providers: [
    ZoneApiService,
    ZoneService,
    {
      provide: ZONE_REPOSITORY_SYMBOL,
      useClass: ZonePrismaRepository,
    },

    NodeApiService,
    NodeService,
    {
      provide: NODE_REPOSITORY_SYMBOL,
      useClass: NodePrismaRepository,
    },

    FiberApiService,
    FiberService,
    {
      provide: FIBER_REPOSITORY_SYMBOL,
      useClass: FiberPrismaRepository,
    },

    NetmaskService,
  ],
})
export class MeshModule {}

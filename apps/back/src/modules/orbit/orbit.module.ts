import { AuthModule } from '@/auth/auth.module';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { PortalController } from './presentation/controllers/portal.controller';
import { TransponderController } from './presentation/controllers/transponder.controller';
import { PortalService } from './domain/services/portal.service';
import { PORTAL_REPOSITORY } from './domain/repositories/portal.repository';
import { PortalPrismaRepository } from './infrastructure/repositories/portal.prisma-repository';
import { PortalApiService } from './application/services/portal.api-service';
import { TransponderApiService } from './application/services/transponder.api-service';
import { TransponderService } from './domain/services/transponder.service';
import { TransponderPrismaRepository } from './infrastructure/repositories/transponder.prisma-repository';
import { TRANSPONDER_REPOSITORY } from './domain/repositories/transponder.repository';
import { EventModule } from '@/event/event.module';
import { MeshModule } from '@/mesh/mesh.module';
import { DNS_PROVIDER } from './domain/services/dns-provider.service';
import { CloudflareDnsProvider } from './infrastructure/services/cloudflare-dns-provider.service';
import { DnsApiKeyController } from './presentation/controllers/dns-api-key.controller';
import { DnsApiKeyApiService } from './application/services/dns-api-key.api-service';
import { DnsApiKeyService } from './domain/services/dns-api-key.service';
import { DNS_API_KEY_REPOSITORY } from './domain/repositories/dns-api-key.repository';
import { DnsApiKeyPrismaRepository } from './infrastructure/repositories/dns-api-key.prisma-repository';

@Module({
  imports: [SharedModule, AuthModule, EventModule, MeshModule],
  controllers: [PortalController, TransponderController, DnsApiKeyController],
  providers: [
    PortalApiService,
    PortalService,
    {
      provide: PORTAL_REPOSITORY,
      useClass: PortalPrismaRepository,
    },
    {
      provide: DNS_PROVIDER,
      useClass: CloudflareDnsProvider,
    },

    DnsApiKeyApiService,
    DnsApiKeyService,
    {
      provide: DNS_API_KEY_REPOSITORY,
      useClass: DnsApiKeyPrismaRepository,
    },

    TransponderApiService,
    TransponderService,
    {
      provide: TRANSPONDER_REPOSITORY,
      useClass: TransponderPrismaRepository,
    },
  ],
})
export class OrbitModule {}

import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { PortalCreateProcessor } from './application/PortalCreateProcessor';
import { PortalUpdateProcessor } from './application/PortalUpdateProcessor';
import { PortalDeleteProcessor } from './application/PortalDeleteProcessor';
import { TransponderCreateProcessor } from './application/TransponderCreateProcessor';
import { TransponderUpdateProcessor } from './application/TransponderUpdateProcessor';
import { TransponderDeleteProcessor } from './application/TransponderDeleteProcessor';
import { LinuxOrbitService } from './infrastructure/services/LinuxOrbitService';
import { StubOrbitService } from './infrastructure/services/StubOrbitService';
import { ORBIT_SERVICE_TOKEN } from './domain/services/OrbitService';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  imports: [SharedModule, EventModule],
  providers: [
    {
      provide: ORBIT_SERVICE_TOKEN,
      useClass: useStubs ? StubOrbitService : LinuxOrbitService,
    },
  ],
  processors: [
    PortalCreateProcessor,
    PortalUpdateProcessor,
    PortalDeleteProcessor,
    TransponderCreateProcessor,
    TransponderUpdateProcessor,
    TransponderDeleteProcessor,
  ],
  exports: [ORBIT_SERVICE_TOKEN],
})
export class OrbitModule {}

import { Module } from '@/decorators/Module';
import { PortalCreateProcessor } from './application/PortalCreateProcessor';
import { PortalUpdateProcessor } from './application/PortalUpdateProcessor';
import { PortalDeleteProcessor } from './application/PortalDeleteProcessor';
import { TransponderCreateProcessor } from './application/TransponderCreateProcessor';
import { TransponderUpdateProcessor } from './application/TransponderUpdateProcessor';
import { TransponderDeleteProcessor } from './application/TransponderDeleteProcessor';
import { OrbitService } from './infrastructure/OrbitService';
import { StubOrbitService } from './infrastructure/StubOrbitService';
import { IOrbitService } from './infrastructure/IOrbitService';
import { IPChecker } from '@/shared/infrastructure/background/IPChecker';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  providers: [
    { provide: IOrbitService, useClass: useStubs ? StubOrbitService : OrbitService },
    { provide: IPChecker },
  ],
  processors: [
    PortalCreateProcessor,
    PortalUpdateProcessor,
    PortalDeleteProcessor,
    TransponderCreateProcessor,
    TransponderUpdateProcessor,
    TransponderDeleteProcessor,
  ],
})
export class OrbitModule {
  constructor(private readonly ipChecker: IPChecker) {}

  start(): void {
    this.ipChecker.start();
  }

  stop(): void {
    this.ipChecker.stop();
  }
}

import { Module } from '../../decorators/Module';
import { PortalCreateProcessor } from './application/PortalCreateProcessor';
import { PortalUpdateProcessor } from './application/PortalUpdateProcessor';
import { PortalDeleteProcessor } from './application/PortalDeleteProcessor';
import { TransponderCreateProcessor } from './application/TransponderCreateProcessor';
import { TransponderUpdateProcessor } from './application/TransponderUpdateProcessor';
import { TransponderDeleteProcessor } from './application/TransponderDeleteProcessor';

@Module({
  processors: [
    PortalCreateProcessor,
    PortalUpdateProcessor,
    PortalDeleteProcessor,
    TransponderCreateProcessor,
    TransponderUpdateProcessor,
    TransponderDeleteProcessor,
  ],
})
export class OrbitModule {}

import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { WorkerModule } from '@/worker/WorkerModule';
import { MeshModule } from '@/mesh/MeshModule';
import { OrbitModule } from '@/orbit/OrbitModule';
import { SystemResetProcessor } from './application/SystemResetProcessor';
import { SystemResetHardProcessor } from './application/SystemResetHardProcessor';
import { DeleteProcessor } from '@/system/application/DeleteProcessor';
import { HostPreflightService } from './infrastructure/services/HostPreflightService';
import { IPChecker } from './application/IPChecker';

@Module({
  imports: [SharedModule, EventModule, WorkerModule, MeshModule, OrbitModule],
  providers: [DeleteProcessor, HostPreflightService, IPChecker],
  processors: [SystemResetProcessor, SystemResetHardProcessor],
  exports: [HostPreflightService],
})
export class SystemModule {}

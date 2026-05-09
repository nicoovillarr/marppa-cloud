import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { WorkerModule } from '@/worker/WorkerModule';
import { MeshModule } from '@/mesh/MeshModule';
import { OrbitModule } from '@/orbit/OrbitModule';
import { SystemResetProcessor } from './application/SystemResetProcessor';
import { DeleteProcessor } from '@/system/application/DeleteProcessor';
import { LeaseReader } from '@/system/application/LeaseReader';

@Module({
  imports: [SharedModule, EventModule, WorkerModule, MeshModule, OrbitModule],
  providers: [DeleteProcessor, LeaseReader],
  processors: [SystemResetProcessor],
})
export class SystemModule {}

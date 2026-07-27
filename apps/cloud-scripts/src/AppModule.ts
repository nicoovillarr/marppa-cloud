import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { SystemModule } from '@/system/SystemModule';
import { WorkerModule } from '@/worker/WorkerModule';
import { MeshModule } from '@/mesh/MeshModule';
import { NucleusModule } from '@/nucleus/NucleusModule';
import { OrbitModule } from '@/orbit/OrbitModule';

@Module({
  imports: [
    SharedModule,
    EventModule,
    SystemModule,
    WorkerModule,
    MeshModule,
    NucleusModule,
    OrbitModule,
  ],
})
export class AppModule {}

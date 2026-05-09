import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { WebSocketModule } from '@/shared/WebSocketModule';
import { HttpModule } from '@/shared/HttpModule';
import { SystemModule } from '@/system/SystemModule';
import { WorkerModule } from '@/worker/WorkerModule';
import { MeshModule } from '@/mesh/MeshModule';
import { OrbitModule } from '@/orbit/OrbitModule';

@Module({
  imports: [SharedModule, EventModule, WebSocketModule, HttpModule, SystemModule, WorkerModule, MeshModule, OrbitModule],
})
export class AppModule {}

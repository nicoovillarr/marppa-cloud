import { Module } from '../decorators/Module';
import { WorkerModule } from '../modules/worker/WorkerModule';
import { MeshModule } from '../modules/mesh/MeshModule';
import { OrbitModule } from '../modules/orbit/OrbitModule';
import { SystemModule } from '../modules/system/SystemModule';

@Module({
  imports: [WorkerModule, MeshModule, OrbitModule, SystemModule],
})
export class AppModule {}

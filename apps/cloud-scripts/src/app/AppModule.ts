import { Module } from '@/decorators/Module';
import { WorkerModule } from '@/worker/WorkerModule';
import { MeshModule } from '@/mesh/MeshModule';
import { OrbitModule } from '@/orbit/OrbitModule';
import { SystemModule } from '@/system/SystemModule';

@Module({
  imports: [WorkerModule, MeshModule, OrbitModule, SystemModule],
})
export class AppModule {}

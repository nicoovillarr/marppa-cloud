import { Module, forwardRef } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { ZoneCreateProcessor } from './application/ZoneCreateProcessor';
import { ZoneDeleteProcessor } from './application/ZoneDeleteProcessor';
import { NodeAssignWorkerProcessor } from './application/NodeAssignWorkerProcessor';
import { NodeUnassignWorkerProcessor } from './application/NodeUnassignWorkerProcessor';
import { NodeCreateFiberProcessor } from './application/NodeCreateFiberProcessor';
import { NodeUpdateFiberProcessor } from './application/NodeUpdateFiberProcessor';
import { NodeDeleteFiberProcessor } from './application/NodeDeleteFiberProcessor';
import { LinuxMeshService } from './infrastructure/services/LinuxMeshService';
import { StubMeshService } from './infrastructure/services/StubMeshService';
import { MESH_SERVICE_TOKEN } from './domain/services/MeshService';
import { WorkerModule } from '@/worker/WorkerModule';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  imports: [SharedModule, EventModule, forwardRef(() => WorkerModule)],
  providers: [
    {
      provide: MESH_SERVICE_TOKEN,
      useClass: useStubs ? StubMeshService : LinuxMeshService,
    },
  ],
  processors: [
    ZoneCreateProcessor,
    ZoneDeleteProcessor,
    NodeAssignWorkerProcessor,
    NodeUnassignWorkerProcessor,
    NodeCreateFiberProcessor,
    NodeUpdateFiberProcessor,
    NodeDeleteFiberProcessor,
  ],
  exports: [MESH_SERVICE_TOKEN],
})
export class MeshModule {}

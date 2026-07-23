import { Module, forwardRef } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { ZoneCreateProcessor } from './application/ZoneCreateProcessor';
import { ZoneDeleteProcessor } from './application/ZoneDeleteProcessor';
import { ZoneStartProcessor } from './application/ZoneStartProcessor';
import { ZoneStopProcessor } from './application/ZoneStopProcessor';
import { NodeAssignWorkerProcessor } from './application/NodeAssignWorkerProcessor';
import { NodeUnassignWorkerProcessor } from './application/NodeUnassignWorkerProcessor';
import { NodeStartProcessor } from './application/NodeStartProcessor';
import { NodeStopProcessor } from './application/NodeStopProcessor';
import { NodeCreateFiberProcessor } from './application/NodeCreateFiberProcessor';
import { NodeUpdateFiberProcessor } from './application/NodeUpdateFiberProcessor';
import { NodeDeleteFiberProcessor } from './application/NodeDeleteFiberProcessor';
import { NodeStartFiberProcessor } from './application/NodeStartFiberProcessor';
import { NodeStopFiberProcessor } from './application/NodeStopFiberProcessor';
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
    ZoneStartProcessor,
    ZoneStopProcessor,
    NodeAssignWorkerProcessor,
    NodeUnassignWorkerProcessor,
    NodeStartProcessor,
    NodeStopProcessor,
    NodeCreateFiberProcessor,
    NodeUpdateFiberProcessor,
    NodeDeleteFiberProcessor,
    NodeStartFiberProcessor,
    NodeStopFiberProcessor,
  ],
  exports: [MESH_SERVICE_TOKEN],
})
export class MeshModule {}

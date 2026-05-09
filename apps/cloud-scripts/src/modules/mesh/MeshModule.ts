import { Module } from '@/decorators/Module';
import { ZoneCreateProcessor } from './application/ZoneCreateProcessor';
import { ZoneDeleteProcessor } from './application/ZoneDeleteProcessor';
import { NodeAssignWorkerProcessor } from './application/NodeAssignWorkerProcessor';
import { NodeUnassignWorkerProcessor } from './application/NodeUnassignWorkerProcessor';
import { NodeCreateFiberProcessor } from './application/NodeCreateFiberProcessor';
import { NodeUpdateFiberProcessor } from './application/NodeUpdateFiberProcessor';
import { NodeDeleteFiberProcessor } from './application/NodeDeleteFiberProcessor';
import { MeshService } from './infrastructure/MeshService';
import { StubMeshService } from './infrastructure/StubMeshService';
import { IMeshService } from './infrastructure/IMeshService';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  providers: [
    { provide: IMeshService, useClass: useStubs ? StubMeshService : MeshService },
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
})
export class MeshModule {}

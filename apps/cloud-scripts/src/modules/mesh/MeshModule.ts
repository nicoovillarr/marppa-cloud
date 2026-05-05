import { Module } from '@/decorators/Module';
import { ZoneCreateProcessor } from './application/ZoneCreateProcessor';
import { ZoneDeleteProcessor } from './application/ZoneDeleteProcessor';
import { NodeAssignWorkerProcessor } from './application/NodeAssignWorkerProcessor';
import { NodeUnassignWorkerProcessor } from './application/NodeUnassignWorkerProcessor';
import { NodeCreateFiberProcessor } from './application/NodeCreateFiberProcessor';
import { NodeUpdateFiberProcessor } from './application/NodeUpdateFiberProcessor';
import { NodeDeleteFiberProcessor } from './application/NodeDeleteFiberProcessor';

@Module({
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

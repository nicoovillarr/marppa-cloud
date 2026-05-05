import { Module } from '@/decorators/Module';
import { WorkerCreateProcessor } from './application/WorkerCreateProcessor';
import { WorkerUpdateProcessor } from './application/WorkerUpdateProcessor';
import { WorkerStartProcessor } from './application/WorkerStartProcessor';
import { WorkerTerminateProcessor } from './application/WorkerTerminateProcessor';
import { WorkerDeleteProcessor } from './application/WorkerDeleteProcessor';
import { WorkerImageCreateProcessor } from './application/WorkerImageCreateProcessor';

@Module({
  processors: [
    WorkerCreateProcessor,
    WorkerUpdateProcessor,
    WorkerStartProcessor,
    WorkerTerminateProcessor,
    WorkerDeleteProcessor,
    WorkerImageCreateProcessor,
  ],
})
export class WorkerModule {}

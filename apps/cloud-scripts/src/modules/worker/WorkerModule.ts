import { Module } from '@/decorators/Module';
import { WorkerCreateProcessor } from './application/WorkerCreateProcessor';
import { WorkerUpdateProcessor } from './application/WorkerUpdateProcessor';
import { WorkerStartProcessor } from './application/WorkerStartProcessor';
import { WorkerTerminateProcessor } from './application/WorkerTerminateProcessor';
import { WorkerDeleteProcessor } from './application/WorkerDeleteProcessor';
import { WorkerImageCreateProcessor } from './application/WorkerImageCreateProcessor';
import { HiveService } from './infrastructure/HiveService';
import { StubHiveService } from './infrastructure/StubHiveService';
import { IHiveService } from './infrastructure/IHiveService';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  providers: [
    { provide: IHiveService, useClass: useStubs ? StubHiveService : HiveService },
  ],
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

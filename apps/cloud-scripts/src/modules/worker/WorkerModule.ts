import { Module } from '@/decorators/Module';
import { WorkerCreateProcessor } from './application/WorkerCreateProcessor';
import { WorkerUpdateProcessor } from './application/WorkerUpdateProcessor';
import { WorkerStartProcessor } from './application/WorkerStartProcessor';
import { WorkerTerminateProcessor } from './application/WorkerTerminateProcessor';
import { WorkerDeleteProcessor } from './application/WorkerDeleteProcessor';
import { WorkerImageCreateProcessor } from './application/WorkerImageCreateProcessor';
import { StubHiveService } from './infrastructure/StubHiveService';
import { HIVE_SERVICE_TOKEN } from './domain/services/HiveService';
import { LinuxHiveService } from './infrastructure/LinuxHiveService';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  providers: [
    {
      provide: HIVE_SERVICE_TOKEN,
      useClass: useStubs ? StubHiveService : LinuxHiveService,
    },
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

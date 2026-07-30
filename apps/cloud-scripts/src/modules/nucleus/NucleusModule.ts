import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { EventModule } from '@/event/EventModule';
import { AtomCreateProcessor } from './application/AtomCreateProcessor';
import { AtomStartProcessor } from './application/AtomStartProcessor';
import { AtomTerminateProcessor } from './application/AtomTerminateProcessor';
import { AtomDeleteProcessor } from './application/AtomDeleteProcessor';
import { NUCLEUS_SERVICE_TOKEN } from './domain/services/NucleusService';
import { DockerNucleusService } from './infrastructure/DockerNucleusService';
import { StubNucleusService } from './infrastructure/StubNucleusService';
import { MeshModule } from '@/mesh/MeshModule';

const useStubs = process.env.USE_STUBS === 'true';

@Module({
  imports: [SharedModule, EventModule, MeshModule],
  providers: [
    {
      provide: NUCLEUS_SERVICE_TOKEN,
      useClass: useStubs ? StubNucleusService : DockerNucleusService,
    },
  ],
  processors: [
    AtomCreateProcessor,
    AtomStartProcessor,
    AtomTerminateProcessor,
    AtomDeleteProcessor,
  ],
  exports: [NUCLEUS_SERVICE_TOKEN],
})
export class NucleusModule {}

import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { EventProcessor } from '@/decorators/EventProcessor';
import { Inject } from '@/decorators/Inject';
import {
  NUCLEUS_SERVICE_TOKEN,
  NucleusService,
} from '../domain/services/NucleusService';
import { AtomVolumeTransitionService } from './AtomVolumeTransitionService';

@EventProcessor(EventType.ATOM_VOLUME_CREATE)
export class AtomVolumeCreateProcessor implements IEventProcessor {
  constructor(
    private readonly transition: AtomVolumeTransitionService,

    @Inject(NUCLEUS_SERVICE_TOKEN)
    private readonly nucleusService: NucleusService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.ATOM_VOLUME_CREATE,
      EventType.ATOM_VOLUME_CREATE_FAILED,
      EventType.ATOM_VOLUME_CREATED,
      async (volume) => ({
        hostPath: await this.nucleusService.createAtomVolume(
          volume.id,
          volume.sizeGiB,
        ),
      }),
    );
  }
}

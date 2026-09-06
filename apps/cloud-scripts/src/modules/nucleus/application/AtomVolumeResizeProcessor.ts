import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { EventProcessor } from '@/decorators/EventProcessor';
import { Inject } from '@/decorators/Inject';
import { AbortError } from '@/event/domain/errors/AbortError';
import {
  NUCLEUS_SERVICE_TOKEN,
  NucleusService,
} from '../domain/services/NucleusService';
import { AtomVolumeTransitionService } from './AtomVolumeTransitionService';

@EventProcessor(EventType.ATOM_VOLUME_RESIZE)
export class AtomVolumeResizeProcessor implements IEventProcessor {
  constructor(
    private readonly transition: AtomVolumeTransitionService,

    @Inject(NUCLEUS_SERVICE_TOKEN)
    private readonly nucleusService: NucleusService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.ATOM_VOLUME_RESIZE,
      EventType.ATOM_VOLUME_RESIZE_FAILED,
      EventType.ATOM_VOLUME_RESIZED,
      async (volume) => {
        if (!volume.hostPath) {
          throw new AbortError(
            `AtomVolume ${volume.id} has no host path to resize`,
            EventType.ATOM_VOLUME_RESIZE_FAILED,
          );
        }

        await this.nucleusService.resizeAtomVolume(
          volume.hostPath,
          volume.sizeGiB,
        );

        return {};
      },
    );
  }
}

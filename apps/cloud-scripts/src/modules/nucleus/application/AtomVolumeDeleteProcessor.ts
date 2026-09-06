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
import {
  AtomVolumePayload,
  AtomVolumeTransitionService,
} from './AtomVolumeTransitionService';

@EventProcessor(EventType.ATOM_VOLUME_DELETE)
export class AtomVolumeDeleteProcessor implements IEventProcessor {
  constructor(
    private readonly transition: AtomVolumeTransitionService,

    @Inject(NUCLEUS_SERVICE_TOKEN)
    private readonly nucleusService: NucleusService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.ATOM_VOLUME_DELETE,
      EventType.ATOM_VOLUME_DELETE_FAILED,
      EventType.ATOM_VOLUME_DELETED,
      (volume) => this.delete(volume, event),
    );
  }

  private async delete(volume: AtomVolumePayload, event: EventPayload) {
    if (volume.atomId) {
      throw new AbortError(
        `AtomVolume ${volume.id} is still attached to atom ${volume.atomId} for event ID: ${event.id}`,
        EventType.ATOM_VOLUME_DELETE_FAILED,
      );
    }

    if (volume.hostPath) {
      await this.nucleusService.deleteAtomVolume(volume.hostPath);
    }

    return { hostPath: null };
  }
}

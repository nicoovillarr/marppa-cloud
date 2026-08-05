import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { EventProcessor } from '@/decorators/EventProcessor';
import { Inject } from '@/decorators/Inject';
import { AbortError } from '@/event/domain/errors/AbortError';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import {
  WorkerDiskPayload,
  WorkerDiskTransitionService,
} from './WorkerDiskTransitionService';

@EventProcessor(EventType.WORKER_DISK_DELETE)
export class WorkerDiskDeleteProcessor implements IEventProcessor {
  constructor(
    private readonly transition: WorkerDiskTransitionService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.WORKER_DISK_DELETE,
      EventType.WORKER_DISK_DELETE_FAILED,
      EventType.WORKER_DISK_DELETED,
      (disk) => this.delete(disk, event),
    );
  }

  private async delete(disk: WorkerDiskPayload, event: EventPayload) {
    if (disk.workerId) {
      throw new AbortError(
        `WorkerDisk ${disk.id} is still attached to worker ${disk.workerId} for event ID: ${event.id}`,
        EventType.WORKER_DISK_DELETE_FAILED,
      );
    }

    if (disk.hostPath) {
      await this.hiveService.deleteWorkerVolume(disk.hostPath);
    }

    return { hostPath: null };
  }
}

import { EventType, ResourceStatus } from '@marppa-cloud/db';
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

@EventProcessor(EventType.WORKER_DISK_DETACH)
export class WorkerDiskDetachProcessor implements IEventProcessor {
  constructor(
    private readonly transition: WorkerDiskTransitionService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.WORKER_DISK_DETACH,
      EventType.WORKER_DISK_DETACH_FAILED,
      EventType.WORKER_DISK_DETACHED,
      (disk) => this.detach(disk, event),
    );
  }

  private async detach(disk: WorkerDiskPayload, event: EventPayload) {
    const { worker, hostPath, mountPoint, deviceTarget } = disk;
    const detached = { workerId: null, deviceTarget: null };

    if (!worker) {
      return detached;
    }

    if (worker.status !== ResourceStatus.INACTIVE) {
      throw new AbortError(
        `Worker ${worker.id} must be INACTIVE to detach a volume (is ${worker.status})`,
        EventType.WORKER_DISK_DETACH_FAILED,
      );
    }

    if (hostPath && mountPoint && deviceTarget) {
      await this.hiveService.detachWorkerVolume(
        worker.id,
        hostPath,
        deviceTarget,
        mountPoint,
      );
    }

    return detached;
  }
}

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

@EventProcessor(EventType.WORKER_DISK_ATTACH)
export class WorkerDiskAttachProcessor implements IEventProcessor {
  constructor(
    private readonly transition: WorkerDiskTransitionService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.WORKER_DISK_ATTACH,
      EventType.WORKER_DISK_ATTACH_FAILED,
      EventType.WORKER_DISK_ATTACHED,
      (disk) => this.attach(disk, event),
    );
  }

  private async attach(disk: WorkerDiskPayload, event: EventPayload) {
    const { worker, hostPath, mountPoint } = disk;

    if (!worker) {
      throw new AbortError(
        `WorkerDisk ${disk.id} has no worker to attach to for event ID: ${event.id}`,
        EventType.WORKER_DISK_ATTACH_FAILED,
      );
    }

    if (!hostPath) {
      throw new AbortError(
        `WorkerDisk ${disk.id} was never provisioned on the host for event ID: ${event.id}`,
        EventType.WORKER_DISK_ATTACH_FAILED,
      );
    }

    if (!mountPoint) {
      throw new AbortError(
        `WorkerDisk ${disk.id} has no mount point for event ID: ${event.id}`,
        EventType.WORKER_DISK_ATTACH_FAILED,
      );
    }

    if (worker.status !== ResourceStatus.INACTIVE) {
      throw new AbortError(
        `Worker ${worker.id} must be INACTIVE to attach a volume (is ${worker.status})`,
        EventType.WORKER_DISK_ATTACH_FAILED,
      );
    }

    const deviceTarget =
      disk.deviceTarget ??
      (await this.hiveService.nextVolumeDeviceTarget(worker.id));

    await this.hiveService.attachWorkerVolume(
      worker.id,
      hostPath,
      deviceTarget,
      mountPoint,
    );

    return { deviceTarget };
  }
}

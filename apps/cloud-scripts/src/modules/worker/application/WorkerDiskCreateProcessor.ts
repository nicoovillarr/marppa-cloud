import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { EventProcessor } from '@/decorators/EventProcessor';
import { Inject } from '@/decorators/Inject';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { WorkerDiskTransitionService } from './WorkerDiskTransitionService';

@EventProcessor(EventType.WORKER_DISK_CREATE)
export class WorkerDiskCreateProcessor implements IEventProcessor {
  constructor(
    private readonly transition: WorkerDiskTransitionService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    await this.transition.run(
      event,
      EventType.WORKER_DISK_CREATE,
      EventType.WORKER_DISK_CREATE_FAILED,
      EventType.WORKER_DISK_CREATED,
      async (disk) => ({
        hostPath: await this.hiveService.createWorkerVolume(
          disk.id,
          disk.sizeGiB,
        ),
      }),
    );
  }
}

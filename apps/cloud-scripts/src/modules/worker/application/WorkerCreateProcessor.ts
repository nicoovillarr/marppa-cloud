import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { Prisma } from '@marppa-cloud/db';
import { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import type { EventPayload } from '@/event/domain/EventPayload';
import { AbortError } from '@/event/domain/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/websocket/WebSocketServer';
import { IHiveService } from '../infrastructure/IHiveService';

type WorkerWithImageAndFlavor = Prisma.WorkerGetPayload<{
  include: { image: true; flavor: true };
}>;

import { EventProcessor } from '@/decorators/EventProcessor';

@EventProcessor(EventType.WORKER_CREATE)
export class WorkerCreateProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly wsServer: WebSocketServer,
    private readonly hiveService: IHiveService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let worker: WorkerWithImageAndFlavor | null = null;

    const updateWorkerStatus = async (status: ResourceStatus) => {
      await this.prisma.worker.update({
        where: { id: worker!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendWorkerMessage(worker!, 'UPDATED', { status });
    };

    try {
      const resourceWorker = event.resources.find((r) => r.resourceType === 'Worker');
      if (!resourceWorker) {
        throw new AbortError(
          `No worker resource found for event ID: ${event.id}`,
          EventType.WORKER_CREATE_FAILED,
        );
      }

      worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { image: true, flavor: true },
      });

      if (!worker) {
        throw new AbortError(
          `Worker not found for event ID: ${event.id}`,
          EventType.WORKER_CREATE_FAILED,
        );
      }

      if (worker.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Worker is not in QUEUED status for event ID: ${event.id}`,
          EventType.WORKER_CREATE_FAILED,
        );
      }

      const publicSshProp = event.properties.find((r) => r.key === 'PublicSSH');
      if (!publicSshProp) {
        throw new AbortError(
          `PublicSSH was not configured`,
          EventType.WORKER_CREATE_FAILED,
        );
      }

      if (!(await this.hiveService.ensureWorkerImageExists(worker.image))) {
        throw new AbortError(
          `Could not generate worker image for event ID: ${event.id}.`,
          EventType.WORKER_CREATE_FAILED,
        );
      }

      await updateWorkerStatus(ResourceStatus.PROVISIONING);

      await this.hiveService.createWorker(
        worker.id,
        worker.name,
        worker.macAddress,
        worker.image,
        worker.flavor,
        publicSshProp ? [publicSshProp.value] : [],
      );

      await updateWorkerStatus(ResourceStatus.INACTIVE);

      this.wsServer.sendWorkerMessage(worker, 'CREATED', worker);

      const createdEvent = await this.repository.createEvent(
        EventType.WORKER_CREATED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(createdEvent.id, 'Event', String(event.id));
      await this.repository.addEventResource(createdEvent.id, 'Worker', worker.id);
    } catch (error) {
      if (error instanceof AbortError) throw error;

      if (worker) {
        await updateWorkerStatus(
          event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
        );
      }
      throw error;
    }
  }
}


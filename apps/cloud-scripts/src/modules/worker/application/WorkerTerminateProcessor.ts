import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import type { WebSocketServer } from '../../shared/infrastructure/websocket/WebSocketServer';
import { HiveService } from '../infrastructure/HiveService';
import { MeshService } from '../../mesh/infrastructure/MeshService';

import { EventProcessor } from '../../../decorators/EventProcessor';

@EventProcessor
export class WorkerTerminateProcessor implements IEventProcessor {
  readonly eventType = EventType.WORKER_TERMINATE;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly wsServer: WebSocketServer,
    private readonly logger: ILogger,
    private readonly hiveService: HiveService,
    private readonly meshService: MeshService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let worker: { id: string; status: string; ownerId: string; node: { zoneId: string } | null; [k: string]: unknown } | null = null;

    const updateWorkerStatus = async (status: ResourceStatus) => {
      await this.prisma.worker.update({
        where: { id: worker!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendWorkerMessage(worker!, 'UPDATED', { status });
    };

    try {
      const resourceWorker = event.resources.find((r) => r.resourceType === 'Worker');
      if (!resourceWorker) throw new Error(`No worker resource found for event ID: ${event.id}`);

      worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId },
        include: { node: true },
      });

      if (!worker) throw new Error(`Worker not found for event ID: ${event.id}`);
      if (worker.status !== ResourceStatus.ACTIVE) {
        throw new Error(`Worker is not in ACTIVE state for event ID: ${event.id}`);
      }

      const vnet = await this.hiveService.getWorkerVnet(worker.id, worker.node?.zoneId);
      if (!vnet) throw new Error(`VNet not found for worker ID: ${worker.id}`);

      await updateWorkerStatus(ResourceStatus.TERMINATING);

      await this.meshService.unlinkVnetFromBridge(vnet, worker.node!.zoneId);
      await this.hiveService.stopWorker(worker.id);

      await updateWorkerStatus(ResourceStatus.INACTIVE);

      this.wsServer.sendWorkerMessage({ id: worker.id }, 'WORKER_TERMINATED', null);

      const eventUpdated = await this.repository.createEvent(EventType.WORKER_TERMINATED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventUpdated.id, 'Event', String(event.id));
      await this.repository.addEventResource(eventUpdated.id, 'Worker', worker.id);
    } catch (error) {
      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);

      if (worker) {
        await this.prisma.worker.update({
          where: { id: worker.id },
          data: {
            status: event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
            updatedBy: event.createdBy,
          },
        });
      }
      throw error;
    }
  }
}


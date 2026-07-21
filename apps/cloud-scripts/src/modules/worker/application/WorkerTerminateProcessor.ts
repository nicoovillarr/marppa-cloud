import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { MESH_SERVICE_TOKEN, MeshService } from '@/mesh/domain/services/MeshService';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.WORKER_TERMINATE);

@EventProcessor(EventType.WORKER_TERMINATE)
export class WorkerTerminateProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
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
      if (worker.status !== STATES.entry) {
        throw new Error(`Worker is not in ${STATES.entry} state for event ID: ${event.id}`);
      }

      const vnet = await this.hiveService.getWorkerVnet(worker.id, worker.node?.zoneId);
      if (!vnet) throw new Error(`VNet not found for worker ID: ${worker.id}`);

      await updateWorkerStatus(STATES.work);

      await this.meshService.unlinkVnetFromBridge(vnet, worker.node!.zoneId);
      await this.hiveService.stopWorker(worker.id);

      await updateWorkerStatus(STATES.ok);

      this.wsServer.sendWorkerMessage({ id: worker.id }, 'WORKER_TERMINATED', null);

      const eventUpdatedId = await this.repository.createEvent(EventType.WORKER_TERMINATED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventUpdatedId, 'Event', String(event.id));
      await this.repository.addEventResource(eventUpdatedId, 'Worker', worker.id);
    } catch (error) {
      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);

      if (worker) {
        await this.prisma.worker.update({
          where: { id: worker.id },
          data: {
            status: event.retries >= 4 ? STATES.fail : STATES.entry,
            updatedBy: event.createdBy,
          },
        });
      }
      throw error;
    }
  }
}


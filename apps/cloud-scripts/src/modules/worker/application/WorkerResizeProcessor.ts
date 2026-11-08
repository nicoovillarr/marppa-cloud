import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '@/event/domain/repositories/EventRepository';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.WORKER_RESIZE);

const MAX_RETRIES = 4;

type PreviousSpecs = {
  flavorId: number;
  cpuCores: number;
  ramMB: number;
};

@EventProcessor(EventType.WORKER_RESIZE)
export class WorkerResizeProcessor implements IEventProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let worker: {
      id: string;
      status: string;
      ownerId: string;
      cpuCores: number;
      ramMB: number;
      [k: string]: unknown;
    } | null = null;

    const updateWorker = async (data: {
      status: ResourceStatus;
      flavorId?: number;
      cpuCores?: number;
      ramMB?: number;
    }) => {
      await this.prisma.worker.update({
        where: { id: worker!.id },
        data: { ...data, updatedBy: event.createdBy },
      });
      this.wsServer.sendWorkerMessage(worker!, 'UPDATED', data);
    };

    try {
      const resourceWorker = event.resources.find(
        (r) => r.resourceType === 'Worker',
      );
      if (!resourceWorker) {
        throw new Error(`No worker resource found for event ID: ${event.id}`);
      }

      worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId },
      });

      if (!worker) {
        throw new Error(`Worker not found for event ID: ${event.id}`);
      }

      if (worker.status !== STATES.entry) {
        throw new Error(
          `Worker is not in ${STATES.entry} state for event ID: ${event.id}`,
        );
      }

      await updateWorker({ status: STATES.work });

      await this.hiveService.resizeWorker(
        worker.id,
        worker.ramMB,
        worker.cpuCores,
      );

      await updateWorker({ status: STATES.ok });
      this.wsServer.sendWorkerMessage(worker, 'WORKER_RESIZED', null);

      const resizedEventId = await this.repository.createEvent(
        EventType.WORKER_RESIZED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(
        resizedEventId,
        'Event',
        String(event.id),
      );
      await this.repository.addEventResource(
        resizedEventId,
        'Worker',
        worker.id,
      );
    } catch (error) {
      this.logger.error(
        `Error processing event ID ${event.id}: ${String(error)}`,
      );

      if (worker) {
        if (event.retries >= MAX_RETRIES) {
          await updateWorker({
            status: STATES.fail,
            ...this.previousSpecs(event),
          });
          this.wsServer.sendWorkerMessage(worker, 'WORKER_RESIZE_FAILED', null);
        } else {
          await updateWorker({ status: STATES.entry });
        }
      }

      throw error;
    }
  }

  private previousSpecs(event: EventPayload): Partial<PreviousSpecs> {
    const read = (key: string): number | undefined => {
      const value = Number(event.properties.find((p) => p.key === key)?.value);
      return Number.isFinite(value) ? value : undefined;
    };

    const flavorId = read('PreviousFlavorId');
    const cpuCores = read('PreviousCpuCores');
    const ramMB = read('PreviousRamMB');

    if (flavorId == null || cpuCores == null || ramMB == null) {
      return {};
    }

    return { flavorId, cpuCores, ramMB };
  }
}

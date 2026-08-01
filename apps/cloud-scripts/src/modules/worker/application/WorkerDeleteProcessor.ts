import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';
import {
  NodeTeardownService,
  nodeTeardownInclude,
  type NodeTeardownPayload,
} from '@/mesh/application/NodeTeardownService';
import { TeardownReport } from '@/shared/domain/TeardownReport';

const STATES = getEventStates(EventType.WORKER_DELETE);

@EventProcessor(EventType.WORKER_DELETE)
export class WorkerDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,

    private readonly nodeTeardown: NodeTeardownService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let worker: {
      id: string;
      status: string;
      ownerId: string;
      macAddress: string;
      node: NodeTeardownPayload | null;
      updatedBy?: string;
      [k: string]: unknown;
    } | null = null;

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
          EventType.WORKER_DELETE_FAILED,
        );
      }

      worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { node: { include: nodeTeardownInclude } },
      });

      if (!worker) {
        throw new AbortError(
          `Worker not found for event ID: ${event.id}`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      if (worker.status !== STATES.entry) {
        throw new AbortError(
          `Worker is not in ${STATES.entry} state for event ID: ${event.id}`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      if (await this.hiveService.isWorkerRunning(worker.id)) {
        throw new AbortError(
          `Worker ${worker.id} is running`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      await updateWorkerStatus(STATES.work);

      const report = new TeardownReport();

      if (worker.node) {
        await this.nodeTeardown.teardown(
          worker.node,
          worker.macAddress,
          event.createdBy,
          report,
        );
      }

      const domainWasDefined = await this.hiveService.deleteWorker(worker.id);
      report.record(
        `vm ${worker.id}`,
        domainWasDefined ? 'removed' : 'absent',
        domainWasDefined ? undefined : 'no libvirt domain, only files cleared',
      );

      await updateWorkerStatus(STATES.ok);

      this.wsServer.sendWorkerMessage(worker, 'DELETED', {
        teardown: report.entries,
      });

      const createdEventId = await this.repository.createEvent(
        EventType.WORKER_DELETED,
        event.createdBy,
        event.companyId,
        undefined,
        report.toNotes(),
      );
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Worker', worker.id);
    } catch (error) {
      if (error instanceof AbortError) {
        if (worker?.status === STATES.entry) {
          await updateWorkerStatus(STATES.fail);
        }
        throw error;
      }

      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);

      if (worker) {
        await updateWorkerStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}


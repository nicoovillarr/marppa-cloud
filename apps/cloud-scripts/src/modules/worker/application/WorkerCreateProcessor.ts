import { randomBytes } from 'crypto';
import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { Prisma } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

type WorkerWithImage = Prisma.WorkerGetPayload<{
  include: { image: true };
}>;

import { EventProcessor } from '@/decorators/EventProcessor';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { SecretCipher } from '@/shared/infrastructure/services/SecretCipher';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.WORKER_CREATE);

@EventProcessor(EventType.WORKER_CREATE)
export class WorkerCreateProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly cipher: SecretCipher,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let worker: WorkerWithImage | null = null;

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
        include: { image: true },
      });

      if (!worker) {
        throw new AbortError(
          `Worker not found for event ID: ${event.id}`,
          EventType.WORKER_CREATE_FAILED,
        );
      }

      if (worker.status !== STATES.entry) {
        throw new AbortError(
          `Worker is not in ${STATES.entry} status for event ID: ${event.id}`,
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

      await updateWorkerStatus(STATES.work);

      const consolePassword = randomBytes(24).toString('base64url');

      await this.hiveService.createWorker(
        worker.id,
        worker.name,
        worker.macAddress,
        worker.image,
        worker,
        [publicSshProp.value],
        consolePassword,
      );

      await this.prisma.worker.update({
        where: { id: worker.id },
        data: { consolePassword: this.cipher.encrypt(consolePassword) },
      });

      await updateWorkerStatus(STATES.ok);

      const { id, name, status, ownerId } = worker;
      this.wsServer.sendWorkerMessage(worker, 'CREATED', { id, name, status, ownerId });

      const createdEventId = await this.repository.createEvent(
        EventType.WORKER_CREATED,
        event.createdBy,
        event.companyId,
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

      if (worker) {
        await updateWorkerStatus(
          event.retries >= 4 ? STATES.fail : STATES.entry,
        );
      }
      throw error;
    }
  }
}


import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { HIVE_SERVICE_TOKEN, HiveService } from '@/worker/domain/services/HiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Inject } from '@/decorators/Inject';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { AbortError } from '@/event/domain/errors/AbortError';

@EventProcessor(EventType.WORKER_UPDATE_SSH_KEYS)
export class WorkerUpdateSshKeysProcessor implements IEventProcessor {

  constructor(
    private readonly logger: LoggerService,

    private readonly prisma: PrismaService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) {}

  public async handle(event: EventPayload): Promise<void> {
    const primary = event.resources.find((r) => r.resourceType === 'Worker');
    if (!primary) {
      throw new AbortError(
        `Event ${event.id} has no Worker resource`,
        EventType.WORKER_UPDATE_SSH_KEYS_FAILED,
      );
    }

    const workerId = primary.resourceId;

    try {
      const keys = await this.prisma.workerSshKey.findMany({
        where: { workerId },
        select: { publicKey: true },
        orderBy: { id: 'asc' },
      });

      await this.hiveService.applySshKeys(
        workerId,
        keys.map((key) => key.publicKey),
      );

      await this.repository.createEvent(
        EventType.WORKER_SSH_KEYS_UPDATED,
        event.createdBy,
        event.companyId,
      );

      this.logger.log(
        `Applied ${keys.length} SSH keys to worker ${workerId}.`,
      );
    } catch (error) {
      await this.repository.createEvent(
        EventType.WORKER_UPDATE_SSH_KEYS_FAILED,
        event.createdBy,
        event.companyId,
      );

      this.logger.error(
        `Failed to apply SSH keys to worker ${workerId}: ${String(error)}`,
      );

      throw error;
    }
  }

}

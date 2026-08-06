import type { Prisma } from '@marppa-cloud/db';
import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { AbortError } from '@/event/domain/errors/AbortError';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '@/event/domain/repositories/EventRepository';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { getEventStates } from '@/shared/domain/EventStateMachine';

export type WorkerDiskPayload = Prisma.WorkerDiskGetPayload<{
  include: { worker: true };
}>;

export const workerDiskInclude = { worker: true } as const;

export type WorkerDiskWork = (
  disk: WorkerDiskPayload,
) => Promise<Prisma.WorkerDiskUncheckedUpdateInput>;

const MAX_RETRIES = 4;

@Injectable()
export class WorkerDiskTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,
  ) { }

  public async run(
    event: EventPayload,
    commandType: EventType,
    failureType: EventType,
    successType: EventType,
    work: WorkerDiskWork,
  ): Promise<void> {
    const states = getEventStates(commandType);
    let disk: WorkerDiskPayload | null = null;

    try {
      disk = await this.loadDisk(event, failureType);

      if (disk.status !== states.entry) {
        throw new AbortError(
          `WorkerDisk ${disk.id} is not in ${states.entry} status for event ID: ${event.id}`,
          failureType,
        );
      }

      await this.applyStatus(disk, states.work, event.createdBy);

      const changes = await work(disk);

      await this.applyStatus(disk, states.ok, event.createdBy, changes);

      await this.emitSuccess(event, successType, disk.id);
    } catch (error) {
      if (error instanceof AbortError) {
        if (disk && disk.status === states.entry) {
          await this.applyStatus(disk, states.fail, event.createdBy);
        }
        throw error;
      }

      this.logger.error(
        `Error processing event ID ${event.id}: ${String(error)}`,
      );

      if (disk) {
        await this.applyStatus(
          disk,
          event.retries >= MAX_RETRIES ? states.fail : states.entry,
          event.createdBy,
        );
      }

      throw error;
    }
  }

  private async loadDisk(
    event: EventPayload,
    failureType: EventType,
  ): Promise<WorkerDiskPayload> {
    const resource = event.resources.find(
      (r) => r.resourceType === 'WorkerDisk',
    );
    if (!resource) {
      throw new AbortError(
        `No worker disk resource found for event ID: ${event.id}`,
        failureType,
      );
    }

    const disk = await this.prisma.workerDisk.findUnique({
      where: {
        id: Number(resource.resourceId),
        status: { not: ResourceStatus.DELETED },
      },
      include: workerDiskInclude,
    });

    if (!disk) {
      throw new AbortError(
        `WorkerDisk not found for event ID: ${event.id}`,
        failureType,
      );
    }

    return disk;
  }

  private async applyStatus(
    disk: WorkerDiskPayload,
    status: ResourceStatus,
    updatedBy: string,
    changes: Prisma.WorkerDiskUncheckedUpdateInput = {},
  ): Promise<void> {
    await this.prisma.workerDisk.update({
      where: { id: disk.id },
      data: { ...changes, status, updatedBy },
    });

    this.wsServer.sendWorkerDiskMessage(disk, 'UPDATED', { status });
  }

  private async emitSuccess(
    event: EventPayload,
    successType: EventType,
    diskId: number,
  ): Promise<void> {
    const createdEventId = await this.repository.createEvent(
      successType,
      event.createdBy,
      event.companyId,
    );
    await this.repository.addEventResource(
      createdEventId,
      'Event',
      String(event.id),
    );
    await this.repository.addEventResource(
      createdEventId,
      'WorkerDisk',
      String(diskId),
    );
  }
}

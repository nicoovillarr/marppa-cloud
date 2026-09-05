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

export type AtomVolumePayload = Prisma.AtomVolumeGetPayload<{
  include: { atom: true };
}>;

export const atomVolumeInclude = { atom: true } as const;

export type AtomVolumeWork = (
  volume: AtomVolumePayload,
) => Promise<Prisma.AtomVolumeUncheckedUpdateInput>;

const MAX_RETRIES = 4;

@Injectable()
export class AtomVolumeTransitionService {
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
    work: AtomVolumeWork,
  ): Promise<void> {
    const states = getEventStates(commandType);
    let volume: AtomVolumePayload | null = null;

    try {
      volume = await this.loadVolume(event, failureType);

      if (volume.status !== states.entry) {
        throw new AbortError(
          `AtomVolume ${volume.id} is not in ${states.entry} status for event ID: ${event.id}`,
          failureType,
        );
      }

      await this.applyStatus(volume, states.work, event.createdBy);

      const changes = await work(volume);

      await this.applyStatus(volume, states.ok, event.createdBy, changes);

      await this.emitSuccess(event, successType, volume.id);
    } catch (error) {
      if (error instanceof AbortError) {
        if (volume && volume.status === states.entry) {
          await this.applyStatus(volume, states.fail, event.createdBy);
        }
        throw error;
      }

      this.logger.error(
        `Error processing event ID ${event.id}: ${String(error)}`,
      );

      if (volume) {
        await this.applyStatus(
          volume,
          event.retries >= MAX_RETRIES ? states.fail : states.entry,
          event.createdBy,
        );
      }

      throw error;
    }
  }

  private async loadVolume(
    event: EventPayload,
    failureType: EventType,
  ): Promise<AtomVolumePayload> {
    const resource = event.resources.find(
      (r) => r.resourceType === 'AtomVolume',
    );
    if (!resource) {
      throw new AbortError(
        `No atom volume resource found for event ID: ${event.id}`,
        failureType,
      );
    }

    const volume = await this.prisma.atomVolume.findUnique({
      where: {
        id: Number(resource.resourceId),
        status: { not: ResourceStatus.DELETED },
      },
      include: atomVolumeInclude,
    });

    if (!volume) {
      throw new AbortError(
        `AtomVolume not found for event ID: ${event.id}`,
        failureType,
      );
    }

    return volume;
  }

  private async applyStatus(
    volume: AtomVolumePayload,
    status: ResourceStatus,
    updatedBy: string,
    changes: Prisma.AtomVolumeUncheckedUpdateInput = {},
  ): Promise<void> {
    await this.prisma.atomVolume.update({
      where: { id: volume.id },
      data: { ...changes, status, updatedBy },
    });

    this.wsServer.sendAtomVolumeMessage(volume, 'UPDATED', { status });
  }

  private async emitSuccess(
    event: EventPayload,
    successType: EventType,
    volumeId: number,
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
      'AtomVolume',
      String(volumeId),
    );
  }
}

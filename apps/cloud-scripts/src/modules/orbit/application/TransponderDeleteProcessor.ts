import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';

import { EventProcessor } from '@/decorators/EventProcessor';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '../domain/services/OrbitService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.TRANSPONDER_DELETE);

@EventProcessor(EventType.TRANSPONDER_DELETE)
export class TransponderDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let transponder: { id: string; status: string; portalId: string; portal: { ownerId: string; transponders: unknown[] }; [k: string]: unknown } | null = null;

    const updateTransponderStatus = async (status: ResourceStatus) => {
      await this.prisma.transponder.update({
        where: { id: transponder!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendTransponderMessage(
        {
          id: transponder!.id,
          portalId: transponder!.portalId,
          ownerId: transponder!.portal.ownerId,
        },
        status === ResourceStatus.DELETED ? 'DELETED' : 'UPDATED',
        { status },
      );
    };

    try {
      const resourceTransponder = event.resources.find((r) => r.resourceType === 'Transponder');
      if (!resourceTransponder) {
        throw new AbortError(
          `No transponder resource found for event ID: ${event.id}`,
          EventType.TRANSPONDER_DELETE_FAILED,
        );
      }

      transponder = await this.prisma.transponder.findUnique({
        where: { id: resourceTransponder.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { portal: { include: { transponders: { include: { node: true } } } } },
      });

      if (!transponder) {
        throw new AbortError(
          `Transponder not found for event ID: ${event.id}`,
          EventType.TRANSPONDER_DELETE_FAILED,
        );
      }

      if (transponder.status !== STATES.entry) {
        throw new AbortError(
          `Transponder status (${transponder.status}) is not valid for event ID: ${event.id}`,
          EventType.TRANSPONDER_DELETE_FAILED,
        );
      }

      await updateTransponderStatus(STATES.work);

      await this.orbitService.generatePortalConfig({
        ...transponder.portal,
        transponders: transponder.portal.transponders.filter(
          (t: { id: string }) => t.id !== transponder!.id,
        ),
      });

      await updateTransponderStatus(STATES.ok);

      const eventCreatedId = await this.repository.createEvent(EventType.TRANSPONDER_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventCreatedId, 'Event', String(event.id));
      await this.repository.addEventResource(eventCreatedId, 'Transponder', transponder.id);
    } catch (error) {
      if (error instanceof AbortError) {
        if (transponder?.status === STATES.entry) {
          await updateTransponderStatus(STATES.fail);
        }
        throw error;
      }
      if (transponder) {
        await updateTransponderStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}


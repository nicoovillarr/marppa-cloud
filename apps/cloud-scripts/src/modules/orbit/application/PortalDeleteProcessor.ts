import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';

import { EventProcessor } from '@/decorators/EventProcessor';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '../domain/services/OrbitService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { AbortError } from '@/event/domain/errors/AbortError';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.PORTAL_DELETE);

@EventProcessor(EventType.PORTAL_DELETE)
export class PortalDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let portal: { id: string; ownerId: string; status: string; [k: string]: unknown } | null = null;

    const broadcastPortalStatus = (status: ResourceStatus) => {
      this.wsServer.sendPortalMessage(
        { id: portal!.id, ownerId: portal!.ownerId },
        status === ResourceStatus.DELETED ? 'DELETED' : 'UPDATED',
        { status },
      );
    };

    const updatePortalStatus = async (status: ResourceStatus) => {
      await this.prisma.portal.update({
        where: { id: portal!.id },
        data: { status, updatedBy: event.createdBy },
      });
      broadcastPortalStatus(status);
    };

    const releasePortalAddress = async () => {
      await this.prisma.portal.update({
        where: { id: portal!.id },
        data: {
          status: STATES.ok,
          deletedAt: new Date(),
          updatedBy: event.createdBy,
        },
      });
      broadcastPortalStatus(STATES.ok);
    };

    try {
      const resourcePortal = event.resources.find((r) => r.resourceType === 'Portal');
      if (!resourcePortal) {
        throw new AbortError(`No portal resource found for event ID: ${event.id}`, EventType.PORTAL_DELETE_FAILED);
      }

      portal = await this.prisma.portal.findUnique({
        where: { id: resourcePortal.resourceId, status: { not: ResourceStatus.DELETED } },
      });

      if (!portal) {
        throw new AbortError(`Portal not found for event ID: ${event.id}`, EventType.PORTAL_DELETE_FAILED);
      }

      if (portal.status !== STATES.entry) {
        throw new AbortError(
          `Portal status (${portal.status}) is not valid for event ID: ${event.id}`,
          EventType.PORTAL_DELETE_FAILED,
        );
      }

      await updatePortalStatus(STATES.work);
      await this.orbitService.deletePortalConfig(portal.id);
      await releasePortalAddress();

      const eventCreatedId = await this.repository.createEvent(EventType.PORTAL_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventCreatedId, 'Event', String(event.id));
      await this.repository.addEventResource(eventCreatedId, 'Portal', portal.id);
    } catch (error) {
      if (error instanceof AbortError) throw error;
      if (portal) {
        await updatePortalStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}


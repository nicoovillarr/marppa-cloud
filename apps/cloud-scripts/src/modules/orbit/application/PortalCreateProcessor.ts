import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '../domain/services/OrbitService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { AbortError } from '@/event/domain/errors/AbortError';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.PORTAL_CREATE);

@EventProcessor(EventType.PORTAL_CREATE)
export class PortalCreateProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let portal: { id: string; status: string; address: string; type: string; apiKey: string; [k: string]: unknown } | null = null;

    const updatePortalStatus = async (status: ResourceStatus) => {
      await this.prisma.portal.update({
        where: { id: portal!.id },
        data: { status, updatedBy: event.createdBy },
      });
    };

    try {
      const resourcePortal = event.resources.find((r) => r.resourceType === 'Portal');
      if (!resourcePortal) {
        throw new AbortError(
          `No portal resource found for event ID: ${event.id}`,
          EventType.PORTAL_CREATE_FAILED,
        );
      }

      portal = await this.prisma.portal.findUnique({
        where: { id: resourcePortal.resourceId, status: { not: ResourceStatus.DELETED } },
      });

      if (!portal) {
        throw new AbortError(`Portal not found for event ID: ${event.id}`, EventType.PORTAL_CREATE_FAILED);
      }

      if (portal.status !== STATES.entry) {
        throw new AbortError(
          `Portal is not in ${STATES.entry} status for event ID: ${event.id}`,
          EventType.PORTAL_CREATE_FAILED,
        );
      }

      await updatePortalStatus(STATES.work);

      await this.orbitService.syncPortalDns({
        id: portal.id,
        address: portal.address,
        type: portal.type,
        apiKey: portal.apiKey,
      });

      await updatePortalStatus(STATES.ok);

      const eventCreatedId = await this.repository.createEvent(EventType.PORTAL_CREATED, event.createdBy, event.companyId);
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


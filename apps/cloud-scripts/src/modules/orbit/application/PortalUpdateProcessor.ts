import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';

import { EventProcessor } from '@/decorators/EventProcessor';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '../domain/services/OrbitService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.PORTAL_UPDATE);

@EventProcessor(EventType.PORTAL_UPDATE)
export class PortalUpdateProcessor implements IEventProcessor {

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
        throw new AbortError(`No portal resource found for event ID: ${event.id}`, EventType.PORTAL_UPDATE_FAILED);
      }

      portal = await this.prisma.portal.findUnique({
        where: { id: resourcePortal.resourceId, status: { not: ResourceStatus.DELETED } },
        include: {
          transponders: {
            where: { status: { not: ResourceStatus.DELETED } },
            include: { node: true },
          },
        },
      });

      if (!portal) {
        throw new AbortError(`Portal not found for event ID: ${event.id}`, EventType.PORTAL_UPDATE_FAILED);
      }

      if (portal.status !== STATES.entry) {
        throw new AbortError(
          `Portal status (${portal.status}) is not valid for event ID: ${event.id}`,
          EventType.PORTAL_UPDATE_FAILED,
        );
      }

      const forceSync = event.properties.some(
        (p) => p.key === 'FORCE_SYNC' && ['true', '1', 'yes'].includes(p.value.toLowerCase()),
      );

      await updatePortalStatus(STATES.work);

      await this.orbitService.generatePortalConfig(portal);
      await this.orbitService.syncPortalDns(
        {
          id: portal.id,
          address: portal.address,
          type: portal.type,
          apiKey: portal.apiKey,
        },
        { force: forceSync },
      );

      await updatePortalStatus(STATES.ok);

      const eventCreatedId = await this.repository.createEvent(EventType.PORTAL_UPDATED, event.createdBy, event.companyId);
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

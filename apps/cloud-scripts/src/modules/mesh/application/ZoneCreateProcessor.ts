import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.ZONE_CREATE);

@EventProcessor(EventType.ZONE_CREATE)
export class ZoneCreateProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let zone: { id: string; status: string; cidr: string; gateway?: string | null; [k: string]: unknown } | null = null;

    const updateZoneStatus = async (status: ResourceStatus) => {
      await this.prisma.zone.update({
        where: { id: zone!.id },
        data: { status, updatedBy: event.createdBy },
      });
    };

    try {
      const resourceZone = event.resources.find((r) => r.resourceType === 'Zone');
      if (!resourceZone) throw new Error(`No zone resource found for event ID: ${event.id}`);

      zone = await this.prisma.zone.findUnique({
        where: { id: resourceZone.resourceId, status: { not: ResourceStatus.DELETED } },
      });

      if (!zone) throw new Error(`Zone not found for event ID: ${event.id}`);
      if (zone.status !== STATES.entry) {
        throw new Error(`Zone is not in ${STATES.entry} state for event ID: ${event.id}`);
      }

      await updateZoneStatus(STATES.work);
      // Use the gateway persisted by the backend so DB and host config can
      // never diverge (it falls back to first-usable only if unset).
      await this.meshService.createZone(zone.cidr, zone.id, zone.gateway ?? null);
      await updateZoneStatus(STATES.ok);

      const createdEventId = await this.repository.createEvent(EventType.ZONE_CREATED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Zone', zone.id);
    } catch (error) {
      if (zone) {
        await updateZoneStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}

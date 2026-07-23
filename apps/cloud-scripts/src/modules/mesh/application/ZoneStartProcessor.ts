import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.ZONE_START);

@EventProcessor(EventType.ZONE_START)
export class ZoneStartProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let zone: { id: string; ownerId: string; status: string; cidr: string; gateway?: string | null; [k: string]: unknown } | null = null;

    const updateZoneStatus = async (status: ResourceStatus) => {
      await this.prisma.zone.update({
        where: { id: zone!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendZoneMessage(
        { id: zone!.id, ownerId: zone!.ownerId },
        'UPDATED',
        { status },
      );
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
      // createZone is idempotent (discardPartialZone wipes any leftover host
      // config first), so rebuilding a previously-stopped zone is safe.
      await this.meshService.createZone(zone.cidr, zone.id, zone.gateway ?? null);
      await updateZoneStatus(STATES.ok);

      const createdEventId = await this.repository.createEvent(EventType.ZONE_STARTED, event.createdBy, event.companyId);
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

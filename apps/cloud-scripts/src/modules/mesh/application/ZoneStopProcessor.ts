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

const STATES = getEventStates(EventType.ZONE_STOP);

@EventProcessor(EventType.ZONE_STOP)
export class ZoneStopProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let zone: { id: string; ownerId: string; status: string; cidr: string; nodes: { status: string }[]; [k: string]: unknown } | null = null;

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
        include: { nodes: true },
      });

      if (!zone) throw new Error(`Zone not found for event ID: ${event.id}`);

      // A live node still owns a DHCP reservation + NIC attachment on this
      // bridge; tearing the zone down under it would strand both. The backend
      // blocks this, but re-check here so a stale event can never do damage.
      const liveNodes = zone.nodes.filter(
        (n) => n.status !== ResourceStatus.INACTIVE && n.status !== ResourceStatus.DELETED,
      );
      if (liveNodes.length > 0) {
        throw new Error(`Zone ${zone.id} has live nodes and cannot be stopped yet.`);
      }

      if (zone.status !== STATES.entry) {
        throw new Error(`Zone is not in ${STATES.entry} state for event ID: ${event.id}`);
      }

      await updateZoneStatus(STATES.work);
      // Same host teardown as delete, but the row survives at INACTIVE so a
      // later ZONE_START can rebuild it.
      await this.meshService.deleteZone(zone.id, zone.cidr);
      await updateZoneStatus(STATES.ok);

      const createdEventId = await this.repository.createEvent(EventType.ZONE_STOPPED, event.createdBy, event.companyId);
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

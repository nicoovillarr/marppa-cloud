import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import type { EventPayload } from '@/event/domain/EventPayload';
import { IMeshService } from '../infrastructure/IMeshService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
@EventProcessor(EventType.ZONE_DELETE)
export class ZoneDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly meshService: IMeshService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let zone: { id: string; status: string; cidr: string; nodes: unknown[]; [k: string]: unknown } | null = null;

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
        include: { nodes: true },
      });

      if (!zone) throw new Error(`Zone not found for event ID: ${event.id}`);

      if (zone.nodes.length > 0) {
        throw new Error(`Zone ${zone.id} has associated nodes and cannot be deleted yet.`);
      }

      if (zone.status !== ResourceStatus.QUEUED) {
        throw new Error(`Zone is not in QUEUED state for event ID: ${event.id}`);
      }

      await updateZoneStatus(ResourceStatus.DELETING);
      await this.meshService.deleteZone(zone.id, zone.cidr);
      await updateZoneStatus(ResourceStatus.DELETED);

      const createdEvent = await this.repository.createEvent(EventType.ZONE_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEvent.id, 'Event', String(event.id));
      await this.repository.addEventResource(createdEvent.id, 'Zone', zone.id);
    } catch (error) {
      if (zone) {
        await updateZoneStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}

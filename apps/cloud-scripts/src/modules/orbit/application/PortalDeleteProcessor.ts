import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import { ILogger } from '@/shared/infrastructure/logger/ILogger';
import type { EventPayload } from '@/event/domain/EventPayload';
import { AbortError } from '@/event/domain/EventPayload';
import { IOrbitService } from '../infrastructure/IOrbitService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
@EventProcessor(EventType.PORTAL_DELETE)
export class PortalDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly orbitService: IOrbitService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let portal: { id: string; status: string; [k: string]: unknown } | null = null;

    const updatePortalStatus = async (status: ResourceStatus) => {
      await this.prisma.portal.update({
        where: { id: portal!.id },
        data: { status, updatedBy: event.createdBy },
      });
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

      if (portal.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Portal status (${portal.status}) is not valid for event ID: ${event.id}`,
          EventType.PORTAL_DELETE_FAILED,
        );
      }

      await updatePortalStatus(ResourceStatus.DELETING);
      await this.orbitService.deleteNginxConfig(portal.id);
      await updatePortalStatus(ResourceStatus.DELETED);

      const eventCreated = await this.repository.createEvent(EventType.PORTAL_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventCreated.id, 'Event', String(event.id));
      await this.repository.addEventResource(eventCreated.id, 'Portal', portal.id);
    } catch (error) {
      if (error instanceof AbortError) throw error;
      if (portal) {
        await updatePortalStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}


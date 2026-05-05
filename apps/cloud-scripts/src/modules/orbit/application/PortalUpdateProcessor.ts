import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import { AbortError } from '../../event/domain/EventPayload';
import type { IOrbitService } from '../infrastructure/IOrbitService';

import { EventProcessor } from '../../../decorators/EventProcessor';

@EventProcessor
export class PortalUpdateProcessor implements IEventProcessor {
  readonly eventType = EventType.PORTAL_UPDATE;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly orbitService: IOrbitService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
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
      });

      if (!portal) {
        throw new AbortError(`Portal not found for event ID: ${event.id}`, EventType.PORTAL_UPDATE_FAILED);
      }

      const forceSync = event.properties.find(
        (p) => p.key === 'FORCE_SYNC' && ['true', '1', 'yes'].includes(p.value.toLowerCase()),
      );

      if (forceSync) {
        const { status } = portal;

        if (status !== ResourceStatus.QUEUED) {
          throw new AbortError(
            `Portal status (${status}) is not valid for event ID: ${event.id}`,
            EventType.PORTAL_UPDATE_FAILED,
          );
        }

        await updatePortalStatus(ResourceStatus.PROVISIONING);
        await this.orbitService.updateDynamicDNS(portal.id, portal.address, portal.type, portal.apiKey);
        await updatePortalStatus(status as ResourceStatus);
      }

      const eventCreated = await this.repository.createEvent(EventType.PORTAL_UPDATED, event.createdBy, event.companyId);
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


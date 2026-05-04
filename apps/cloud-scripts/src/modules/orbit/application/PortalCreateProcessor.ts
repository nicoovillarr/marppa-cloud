import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import { AbortError } from '../../event/domain/EventPayload';
import { OrbitService } from '../infrastructure/OrbitService';

export class PortalCreateProcessor implements IEventProcessor {
  readonly eventType = EventType.PORTAL_CREATE;
  
  private orbitService: OrbitService = new OrbitService();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
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

      if (portal.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Portal is not in QUEUED status for event ID: ${event.id}`,
          EventType.PORTAL_CREATE_FAILED,
        );
      }

      await updatePortalStatus(ResourceStatus.PROVISIONING);

      await this.orbitService.createPortal(portal.id, portal.address, portal.type, portal.apiKey);

      await updatePortalStatus(ResourceStatus.ACTIVE);

      const eventCreated = await this.repository.createEvent(EventType.PORTAL_CREATED, event.createdBy, event.companyId);
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


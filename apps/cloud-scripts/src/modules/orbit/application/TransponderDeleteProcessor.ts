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
@EventProcessor(EventType.TRANSPONDER_DELETE)
export class TransponderDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly orbitService: IOrbitService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let transponder: { id: string; status: string; portal: { transponders: unknown[] }; [k: string]: unknown } | null = null;

    const updateTransponderStatus = async (status: ResourceStatus) => {
      await this.prisma.transponder.update({
        where: { id: transponder!.id },
        data: { status, updatedBy: event.createdBy },
      });
    };

    try {
      const resourceTransponder = event.resources.find((r) => r.resourceType === 'Transponder');
      if (!resourceTransponder) {
        throw new AbortError(
          `No transponder resource found for event ID: ${event.id}`,
          EventType.TRANSPONDER_DELETE_FAILED,
        );
      }

      transponder = await this.prisma.transponder.findUnique({
        where: { id: resourceTransponder.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { portal: { include: { transponders: { include: { node: true } } } } },
      });

      if (!transponder) {
        throw new AbortError(
          `Transponder not found for event ID: ${event.id}`,
          EventType.TRANSPONDER_DELETE_FAILED,
        );
      }

      if (transponder.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Transponder status (${transponder.status}) is not valid for event ID: ${event.id}`,
          EventType.TRANSPONDER_DELETE_FAILED,
        );
      }

      await updateTransponderStatus(ResourceStatus.DELETING);

      await this.orbitService.generateNginxConfig({
        ...transponder.portal,
        transponders: transponder.portal.transponders.filter(
          (t: { id: string }) => t.id !== transponder!.id,
        ),
      });

      await updateTransponderStatus(ResourceStatus.DELETED);

      const eventCreated = await this.repository.createEvent(EventType.TRANSPONDER_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventCreated.id, 'Event', String(event.id));
      await this.repository.addEventResource(eventCreated.id, 'Transponder', transponder.id);
    } catch (error) {
      if (error instanceof AbortError) throw error;
      if (transponder) {
        await updateTransponderStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}


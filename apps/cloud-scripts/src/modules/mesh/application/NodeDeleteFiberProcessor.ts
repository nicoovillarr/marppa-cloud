import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import { AbortError } from '../../event/domain/EventPayload';
import { MeshService } from '../infrastructure/MeshService';

export class NodeDeleteFiberProcessor implements IEventProcessor {
  readonly eventType = EventType.NODE_DELETE_FIBER;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly meshService: MeshService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let fiber: { id: number; status: string; protocol: string; hostPort: number | null; targetPort: number; node: { ipAddress: string; zoneId: string } } | null = null;

    const updateFiberStatus = async (status: ResourceStatus) => {
      await this.prisma.fiber.update({
        where: { id: fiber!.id },
        data: { status, updatedBy: event.createdBy },
      });
    };

    try {
      const resourceFiber = event.resources.find((r) => r.resourceType === 'Fiber');
      if (!resourceFiber) throw new Error(`No fiber resource found for event ID: ${event.id}`);

      fiber = await this.prisma.fiber.findUnique({
        where: { id: Number(resourceFiber.resourceId), status: { not: ResourceStatus.DELETED } },
        include: { node: true },
      });

      if (!fiber) {
        throw new AbortError(
          `Fiber not found for event ID: ${event.id}`,
          EventType.NODE_DELETE_FIBER_FAILED,
        );
      }

      if (fiber.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Fiber is not in QUEUED status for event ID: ${event.id}`,
          EventType.NODE_DELETE_FIBER_FAILED,
        );
      }

      await updateFiberStatus(ResourceStatus.DELETING);

      await this.meshService.removeFiber(
        fiber.node.zoneId,
        fiber.protocol,
        fiber.hostPort,
        fiber.node.ipAddress,
        fiber.targetPort,
      );

      await updateFiberStatus(ResourceStatus.DELETED);

      const createdEvent = await this.repository.createEvent(EventType.NODE_FIBER_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEvent.id, 'Event', String(event.id));
      await this.repository.addEventResource(createdEvent.id, 'Fiber', String(fiber.id));
    } catch (error) {
      if (error instanceof AbortError) throw error;

      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);
      if (fiber) {
        await updateFiberStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}


import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { AbortError } from '@/event/domain/errors/AbortError';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.NODE_STOP_FIBER);

/**
 * Turn a fiber off: remove its DNAT rules from the host but keep the row (with
 * its hostPort) at INACTIVE, so NODE_START_FIBER can re-publish the exact same
 * mapping later.
 */
@EventProcessor(EventType.NODE_STOP_FIBER)
export class NodeStopFiberProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
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
          EventType.NODE_STOP_FIBER_FAILED,
        );
      }

      if (fiber.status !== STATES.entry) {
        throw new AbortError(
          `Fiber is not in ${STATES.entry} status for event ID: ${event.id}`,
          EventType.NODE_STOP_FIBER_FAILED,
        );
      }

      await updateFiberStatus(STATES.work);

      await this.meshService.removeFiber(
        fiber.node.zoneId,
        fiber.protocol,
        fiber.hostPort,
        fiber.node.ipAddress,
        fiber.targetPort,
      );

      await updateFiberStatus(STATES.ok);

      const createdEventId = await this.repository.createEvent(EventType.NODE_FIBER_STOPPED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Fiber', String(fiber.id));
    } catch (error) {
      if (error instanceof AbortError) throw error;

      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);
      if (fiber) {
        await updateFiberStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}

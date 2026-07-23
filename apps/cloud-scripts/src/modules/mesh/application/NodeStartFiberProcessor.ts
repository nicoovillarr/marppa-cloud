import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { AbortError } from '@/event/domain/errors/AbortError';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { PortConflictError } from '../domain/errors/PortConflictError';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.NODE_START_FIBER);

/**
 * Turn a fiber back on: re-add its DNAT rules. Reuses the hostPort the fiber
 * already owns so the published mapping is identical to before it was stopped;
 * only if that port is somehow taken does it fall back to a fresh one.
 */
@EventProcessor(EventType.NODE_START_FIBER)
export class NodeStartFiberProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
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
          EventType.NODE_START_FIBER_FAILED,
        );
      }

      if (fiber.status !== STATES.entry) {
        throw new AbortError(
          `Fiber is not in ${STATES.entry} status for event ID: ${event.id}`,
          EventType.NODE_START_FIBER_FAILED,
        );
      }

      const portIsAvailable = await this.meshService.isPortAvailable(fiber.node.ipAddress, fiber.targetPort, fiber.protocol);
      if (!portIsAvailable) {
        throw new AbortError(
          `Port ${fiber.targetPort}/${fiber.protocol} is not available for ${fiber.node.ipAddress}.`,
          EventType.NODE_START_FIBER_FAILED,
        );
      }

      await updateFiberStatus(STATES.work);

      // Prefer the hostPort the fiber already owns; only allocate a new one if it
      // is missing or now taken by another mapping.
      let hostPort = fiber.hostPort ?? undefined;
      const maxPortRetries = 5;
      for (let attempt = 0; attempt < maxPortRetries; attempt++) {
        if (hostPort == null) {
          hostPort = await this.meshService.findNextPort(fiber.protocol);
        }
        try {
          await this.meshService.addFiber(fiber.node.zoneId, fiber.protocol, hostPort, fiber.node.ipAddress, fiber.targetPort);
          break;
        } catch (err) {
          if (err instanceof PortConflictError && attempt < maxPortRetries - 1) {
            hostPort = undefined;
            continue;
          }
          throw err;
        }
      }

      await this.prisma.fiber.update({
        where: { id: fiber.id },
        data: { hostPort, status: STATES.ok, updatedBy: event.createdBy },
      });

      const createdEventId = await this.repository.createEvent(EventType.NODE_FIBER_STARTED, event.createdBy, event.companyId);
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

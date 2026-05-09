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

@EventProcessor(EventType.NODE_CREATE_FIBER)
export class NodeCreateFiberProcessor implements IEventProcessor {

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

      if (!fiber) throw new Error(`Fiber not found for event ID: ${event.id}`);

      if (fiber.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Fiber is not in QUEUED status for event ID: ${event.id}`,
          EventType.NODE_CREATE_FIBER_FAILED,
        );
      }

      const portIsAvailable = await this.meshService.isPortAvailable(fiber.node.ipAddress, fiber.targetPort, fiber.protocol);
      if (!portIsAvailable) {
        throw new AbortError(
          `Port ${fiber.targetPort}/${fiber.protocol} is not available for ${fiber.node.ipAddress}.`,
          EventType.NODE_CREATE_FIBER_FAILED,
        );
      }

      await updateFiberStatus(ResourceStatus.PROVISIONING);

      let hostPort!: number;
      const maxPortRetries = 5;
      for (let attempt = 0; attempt < maxPortRetries; attempt++) {
        hostPort = await this.meshService.findNextPort(fiber.protocol);
        try {
          await this.meshService.addFiber(fiber.node.zoneId, fiber.protocol, hostPort, fiber.node.ipAddress, fiber.targetPort);
          break;
        } catch (err) {
          if (err instanceof PortConflictError && attempt < maxPortRetries - 1) continue;
          throw err;
        }
      }

      await this.prisma.fiber.update({
        where: { id: fiber.id },
        data: { hostPort, status: ResourceStatus.ACTIVE, updatedBy: event.createdBy },
      });

      const createdEventId = await this.repository.createEvent(EventType.NODE_FIBER_CREATED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Fiber', String(fiber.id));
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


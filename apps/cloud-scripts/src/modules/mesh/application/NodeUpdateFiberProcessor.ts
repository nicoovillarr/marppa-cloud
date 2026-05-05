import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import { AbortError } from '../../event/domain/EventPayload';
import type { IMeshService } from '../infrastructure/IMeshService';

import { EventProcessor } from '../../../decorators/EventProcessor';

@EventProcessor
export class NodeUpdateFiberProcessor implements IEventProcessor {
  readonly eventType = EventType.NODE_UPDATE_FIBER;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly meshService: IMeshService,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let fiber: { id: number; status: string; protocol: string; hostPort: number | null; targetPort: number; node: { ipAddress: string; zoneId: string } } | null = null;

    const updateFiberStatus = async (status: ResourceStatus) => {
      await this.prisma.fiber.update({
        where: { id: fiber!.id },
        data: { status, updatedBy: event.createdBy },
      });
    };

    const addCompleteEvent = async (fiberId: number) => {
      const createdEvent = await this.repository.createEvent(EventType.NODE_FIBER_UPDATED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEvent.id, 'Event', String(event.id));
      await this.repository.addEventResource(createdEvent.id, 'Fiber', String(fiberId));
    };

    try {
      const resourceFiber = event.resources.find((r) => r.resourceType === 'Fiber');
      if (!resourceFiber) throw new Error(`No fiber resource found for event ID: ${event.id}`);

      fiber = await this.prisma.fiber.findUnique({
        where: { id: Number(resourceFiber.resourceId), status: { not: ResourceStatus.DELETED } },
        include: { node: true },
      });

      if (!fiber) throw new Error(`Fiber not found for event ID: ${event.id}`);
      if (fiber.status !== ResourceStatus.ACTIVE) {
        throw new Error(`Fiber is not in ACTIVE status for event ID: ${event.id}`);
      }

      const newTargetPort = event.properties.find((p) => p.key === 'NEW_TARGET_PORT');
      const newProtocol = event.properties.find((p) => p.key === 'NEW_PROTOCOL');

      if (!newTargetPort || !newProtocol) {
        this.logger.warn(`Missing NEW_TARGET_PORT or NEW_PROTOCOL for event ID: ${event.id}. Skipping...`);
        await addCompleteEvent(fiber.id);
        return;
      }

      const actualPort = parseInt(newTargetPort.value, 10);
      const actualProtocol = newProtocol.value;

      const portIsAvailable = await this.meshService.isPortAvailable(fiber.node.ipAddress, actualPort, actualProtocol);
      if (!portIsAvailable) {
        throw new AbortError(
          `Port ${actualPort}/${actualProtocol} is not available for ${fiber.node.ipAddress}.`,
          EventType.NODE_UPDATE_FIBER_FAILED,
        );
      }

      await updateFiberStatus(ResourceStatus.PROVISIONING);

      await this.meshService.removeFiber(fiber.node.zoneId, fiber.protocol, fiber.hostPort, fiber.node.ipAddress, fiber.targetPort);
      await this.meshService.addFiber(fiber.node.zoneId, actualProtocol, fiber.hostPort, fiber.node.ipAddress, actualPort);

      await this.prisma.fiber.update({
        where: { id: fiber.id },
        data: { protocol: actualProtocol, targetPort: actualPort, updatedBy: event.createdBy },
      });

      await updateFiberStatus(ResourceStatus.ACTIVE);
      await addCompleteEvent(fiber.id);
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


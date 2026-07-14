import { Injectable } from '@/decorators/Injectable';
import type { EventPayload } from '../../domain/models/EventPayload';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { ResourceQueueService } from '@/shared/infrastructure/services/ResourceQueueService';
import { EventResourceRole, EventType } from '@marppa-cloud/db';
import { FAILED_VARIANT } from '../../domain/models/FailedVariant';

@Injectable()
export class PrismaEventRepository extends EventRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly resourceQueue: ResourceQueueService,
  ) {
    super();
  }

  public async findById(id: number): Promise<EventPayload | null> {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        resources: true,
        properties: true,
      },
    }) as Promise<EventPayload | null>;
  }

  public async markProcessed(id: number): Promise<void> {
    const event = await this.findById(id);
    if (!event || event.processedAt != null) return;

    await this.prisma.event.update({
      where: { id },
      data: { processedAt: new Date() },
    });

    const primary = event.resources.find(
      (r) => r.role === EventResourceRole.PRIMARY,
    );
    if (primary) {
      await this.resourceQueue.advance(
        { type: primary.resourceType, id: primary.resourceId },
        id,
      );
    }
  }

  public async markFailed(id: number): Promise<void> {
    const event = await this.findById(id);
    if (!event) return;

    const alreadyFailed = event.failedAt != null;
    if (!alreadyFailed) {
      await this.prisma.event.update({
        where: { id },
        data: { failedAt: new Date() },
      });
    }

    const primary = event.resources.find(
      (r) => r.role === EventResourceRole.PRIMARY,
    );
    if (!primary) return;

    if (!alreadyFailed) {
      await this.resourceQueue.advance(
        { type: primary.resourceType, id: primary.resourceId },
        id,
      );
    }

    const children = await this.prisma.event.findMany({
      where: {
        processedAt: null,
        failedAt: null,
        resources: {
          some: {
            role: EventResourceRole.PARENT,
            resourceType: primary.resourceType,
            resourceId: primary.resourceId,
          },
        },
      },
      include: { resources: true },
    });

    for (const child of children) {
      const childPrimary = child.resources.find(
        (r) => r.role === EventResourceRole.PRIMARY,
      );

      const failedVariant = FAILED_VARIANT[child.type as EventType];
      if (failedVariant) {
        try {
          const failedEventId = await this.createEvent(
            failedVariant,
            child.createdBy,
            child.companyId,
            undefined,
            `Cascade fail from event ${id}`,
          );
          await this.addEventResource(
            failedEventId,
            'Event',
            String(child.id),
          );
        } catch (err) {
          this.logger.error(
            `[PrismaEventRepository] Failed to emit cascade _FAILED event for child ${child.id}: ${String(err)}`,
          );
        }
      }

      if (childPrimary) {
        await this.resourceQueue.cancel(
          {
            type: childPrimary.resourceType,
            id: childPrimary.resourceId,
          },
          child.id,
        );
      }

      await this.markFailed(child.id);
    }
  }

  public async incrementRetry(id: number): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { retries: { increment: 1 } },
    });
  }

  public async createEvent(
    type: string,
    createdBy: string,
    companyId: string,
    data?: Record<string, any>,
    notes?: string | null,
  ): Promise<number> {
    const { id } = await this.prisma.event.create({
      data: {
        type,
        notes: notes ?? null,
        data: data != null ? JSON.stringify(data) : undefined,
        createdBy,
        companyId,
      },
      select: { id: true },
    });

    return id;
  }

  public async addEventResource(
    eventId: number,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    await this.prisma.eventResource.create({
      data: {
        eventId,
        resourceType,
        resourceId: String(resourceId),
      },
    });
  }
}

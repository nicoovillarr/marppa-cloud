import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventRepository } from '../domain/IEventRepository';
import type { EventPayload } from '../domain/EventPayload';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';

export class PrismaEventRepository implements IEventRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger,
  ) {}

  async findById(id: number): Promise<EventPayload | null> {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        resources: true,
        properties: true,
      },
    }) as Promise<EventPayload | null>;
  }

  async markProcessed(id: number): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  async markFailed(id: number): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { failedAt: new Date() },
    });
  }

  async incrementRetry(id: number): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { retries: { increment: 1 } },
    });
  }

  async createEvent(
    type: string,
    createdBy: string,
    companyId: string,
    data?: unknown,
    notes?: string | null,
  ): Promise<{ id: number }> {
    const event = await this.prisma.event.create({
      data: {
        type,
        notes: notes ?? null,
        data: data != null ? JSON.stringify(data) : undefined,
        createdBy,
        companyId,
      },
      select: { id: true },
    });

    return event;
  }

  async addEventResource(
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


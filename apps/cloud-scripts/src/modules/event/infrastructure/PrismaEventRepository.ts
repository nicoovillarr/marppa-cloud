import type { PrismaClient } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { IEventRepository } from '../domain/IEventRepository';
import type { EventPayload } from '../domain/EventPayload';
import { ILogger } from '@/shared/infrastructure/logger/ILogger';

@Injectable()
export class PrismaEventRepository extends IEventRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger,
  ) { super(); }

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

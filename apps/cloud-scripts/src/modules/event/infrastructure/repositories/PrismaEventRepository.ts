import { Injectable } from '@/decorators/Injectable';
import type { EventPayload } from '../../domain/models/EventPayload';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';

@Injectable()
export class PrismaEventRepository extends EventRepository {
  constructor(private readonly prisma: PrismaService) {
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
    await this.prisma.event.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  public async markFailed(id: number): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { failedAt: new Date() },
    });
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

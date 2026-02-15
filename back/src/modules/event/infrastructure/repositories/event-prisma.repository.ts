import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventRepository } from '../../domain/repositories/event.repository';
import { EventPropertyEntity } from '../../domain/entities/event-property.entity';
import { EventResourceEntity } from '../../domain/entities/event-resource.entity';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventPrismaMapper } from '../mappers/event-prisma.mapper';
import { EventWithRelationsModel } from '../../domain/models/event-with-relations.model';
import { EventResourcePrismaMapper } from '../mappers/event-resource-prisma.mappers';
import { EventPropertyPrismaMapper } from '../mappers/event-property-prisma.mapper';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class EventPrismaRepository implements EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<EventWithRelationsModel | null> {
    const eventFound = await this.prisma.event.findUnique({
      where: { id },
      include: {
        resources: true,
        properties: true,
      },
    });

    if (!eventFound) {
      return null;
    }

    return new EventWithRelationsModel({
      event: EventPrismaMapper.toEntity(eventFound),
      resources: eventFound.resources.map((r) =>
        EventResourcePrismaMapper.toEntity(r),
      ),
      properties: eventFound.properties.map((p) =>
        EventPropertyPrismaMapper.toEntity(p),
      ),
    });
  }

  async findMany(): Promise<EventEntity[]> {
    const results = await this.prisma.event.findMany();
    return results.map((r) => EventPrismaMapper.toEntity(r));
  }

  async create(entity: EventEntity): Promise<EventEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const event = await this.prisma.event.create({
      data: sanitized,
    });

    return EventPrismaMapper.toEntity(event);
  }

  async addEventResource(
    eventId: number,
    eventResource: EventResourceEntity,
  ): Promise<EventResourceEntity> {
    const eventResourceCreated = await this.prisma.eventResource.create({
      data: {
        eventId,
        resourceId: eventResource.resourceId,
        resourceType: eventResource.resourceType,
      },
    });

    return EventResourcePrismaMapper.toEntity(eventResourceCreated);
  }

  async addEventProperty(
    eventId: number,
    eventProperty: EventPropertyEntity,
  ): Promise<EventPropertyEntity> {
    const eventPropertyCreated = await this.prisma.eventProperty.create({
      data: {
        eventId,
        key: eventProperty.key,
        value: eventProperty.value,
      },
    });

    return EventPropertyPrismaMapper.toEntity(eventPropertyCreated);
  }
}

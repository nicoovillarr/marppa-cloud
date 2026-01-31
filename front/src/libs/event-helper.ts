import prisma from "./prisma";
import { Event, EventType } from "@prisma/client";

export class EventHelper {
  public static async createEvent(
    type: EventType,
    createdBy: string,
    companyId: string,
    data?: Record<string, any>
  ): Promise<Event> {
    const event = await prisma.event.create({
      data: {
        type,
        data: data != null ? data : null,
        createdBy,
        company: {
          connect: { id: companyId },
        },
      },
    });

    return event;
  }

  public static async addEventResource(
    eventId: number,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    await prisma.eventResource.create({
      data: {
        eventId,
        resourceId,
        resourceType,
      },
    });
  }

  public static async addEventProperty(
    eventId: number,
    key: string,
    value: string
  ): Promise<void> {
    await prisma.eventProperty.create({
      data: {
        eventId,
        key,
        value,
      },
    });
  }
}

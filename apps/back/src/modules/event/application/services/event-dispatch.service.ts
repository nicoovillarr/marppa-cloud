import { Injectable } from '@nestjs/common';
import { EventResourceRole } from '@marppa-cloud/db';
import { EventService } from '@/event/domain/services/event.service';
import { EventQueueService } from '@/shared/infrastructure/services/event-queue.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

export interface DispatchResourceRef {
  type: string;
  id: string;
}

export interface DispatchInput {
  type: EventTypeKey;
  primary: DispatchResourceRef;
  parent?: DispatchResourceRef;
  related?: DispatchResourceRef[];
  properties?: Record<string, string>;
  notes?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class EventDispatchService {
  constructor(
    private readonly eventService: EventService,
    private readonly eventQueueService: EventQueueService,
  ) {}

  public async dispatch(input: DispatchInput): Promise<number> {
    const { id: eventId } = await this.eventService.create({
      type: input.type,
      notes: input.notes,
      data: input.data,
    });

    if (eventId == null) {
      throw new Error('EventDispatchService: created event missing id');
    }

    await this.eventService.addEventResource(
      eventId,
      input.primary.type,
      input.primary.id,
      EventResourceRole.PRIMARY,
    );

    if (input.parent) {
      await this.eventService.addEventResource(
        eventId,
        input.parent.type,
        input.parent.id,
        EventResourceRole.PARENT,
      );
    }

    if (input.related) {
      for (const r of input.related) {
        await this.eventService.addEventResource(
          eventId,
          r.type,
          r.id,
          EventResourceRole.RELATED,
        );
      }
    }

    if (input.properties) {
      for (const [key, value] of Object.entries(input.properties)) {
        await this.eventService.addEventProperty(eventId, key, value);
      }
    }

    await this.eventQueueService.enqueue(eventId, input.primary);

    return eventId;
  }
}

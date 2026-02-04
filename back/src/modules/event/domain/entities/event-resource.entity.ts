import { BaseEntity } from "@/shared/domain/entities/base.entity";

interface EventResourceOptionalProps {
  id?: number,
}

export class EventResourceEntity extends BaseEntity {
  public readonly id: number | null;

  constructor(
    public readonly eventId: number,
    public readonly resourceType: string,
    public readonly resourceId: string,
    optionals: EventResourceOptionalProps = {}
  ) {
    super();

    this.id = optionals.id ?? null;
  }

  toObject() {
    return {
      id: this.id,
      eventId: this.eventId,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    }
  }
}
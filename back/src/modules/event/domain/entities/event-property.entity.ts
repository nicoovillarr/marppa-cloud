import { BaseEntity } from "@/shared/domain/entities/base.entity";

interface EventPropertyOptionalProps {
  id?: number,
}

export class EventPropertyEntity extends BaseEntity {
  public readonly id: number | null;

  constructor(
    public readonly eventId: number,
    public readonly key: string,
    public readonly value: string,
    optionals: EventPropertyOptionalProps = {}
  ) {
    super();

    this.id = optionals.id ?? null;
  }

  toObject() {
    return {
      id: this.id,
      eventId: this.eventId,
      key: this.key,
      value: this.value,
    }
  }
}
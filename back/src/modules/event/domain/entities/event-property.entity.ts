import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { BaseEntity } from '@/shared/domain/entities/base.entity';

interface EventPropertyOptionalProps {
  id?: number;
}

export class EventPropertyEntity extends BaseEntity {
  @PrimaryKey()
  public readonly id?: number;

  constructor(
    public readonly eventId: number,
    public readonly key: string,
    public readonly value: string,
    optionals: EventPropertyOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
  }

  toObject() {
    return {
      id: this.id,
      eventId: this.eventId,
      key: this.key,
      value: this.value,
    };
  }
}

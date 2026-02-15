import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { BaseEntity } from '@/shared/domain/entities/base.entity';

interface EventResourceOptionalProps {
  id?: number;
}

export class EventResourceEntity extends BaseEntity {
  @PrimaryKey()
  public readonly id?: number;

  constructor(
    public readonly eventId: number,
    public readonly resourceType: string,
    public readonly resourceId: string,
    optionals: EventResourceOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
  }

  toObject() {
    return {
      id: this.id,
      eventId: this.eventId,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

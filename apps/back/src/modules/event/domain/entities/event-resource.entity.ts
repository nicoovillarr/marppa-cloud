import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { BaseEntity } from '@/shared/domain/entities/base.entity';
import { EventResourceRole } from '@marppa-cloud/db';

interface EventResourceOptionalProps {
  id?: number;
  role?: EventResourceRole;
}

export class EventResourceEntity extends BaseEntity {
  @PrimaryKey()
  public readonly id?: number;
  public readonly role: EventResourceRole;

  constructor(
    public readonly eventId: number,
    public readonly resourceType: string,
    public readonly resourceId: string,
    optionals: EventResourceOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.role = optionals.role ?? EventResourceRole.RELATED;
  }

  toObject() {
    return {
      id: this.id,
      eventId: this.eventId,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      role: this.role,
    };
  }
}

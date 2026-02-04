import { EventPropertyEntity } from "../entities/event-property.entity";
import { EventResourceEntity } from "../entities/event-resource.entity";
import { EventEntity } from "../entities/event.entity";

interface EventwithRelationsProps {
  event: EventEntity;
  resources?: EventResourceEntity[];
  properties?: EventPropertyEntity[];
}

export class EventWithRelations {
  public readonly event: EventEntity;
  public readonly resources: EventResourceEntity[];
  public readonly properties: EventPropertyEntity[]

  constructor(props: EventwithRelationsProps) {
    this.event = props.event;
    this.resources = props.resources ?? [];
    this.properties = props.properties ?? [];
  }

  toObject() {
    return {
      ...this.event.toObject(),
      resources: this.resources.map(r => r.toObject()),
      properties: this.properties.map(p => p.toObject()),
    };
  }
}

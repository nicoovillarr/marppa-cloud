import { NodeEntity } from '../entities/node.entity';
import { ZoneEntity } from '../entities/zone.entity';

interface ZoneWithNodesProps {
  zone: ZoneEntity;
  nodes?: NodeEntity[];
}

export class ZoneWithNodesModel {
  public readonly zone: ZoneEntity;
  public readonly nodes: NodeEntity[];

  constructor(props: ZoneWithNodesProps) {
    this.zone = props.zone;
    this.nodes = props.nodes ?? [];
  }

  toObject() {
    return {
      ...this.zone.toObject(),
      nodes: this.nodes.map((n) => n.toObject()),
    };
  }
}

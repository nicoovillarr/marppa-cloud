import { NodeEntity } from '../entities/node.entity';
import { ZoneEntity } from '../entities/zone.entity';

interface ZoneWithNodesProps {
  zone: ZoneEntity;
  nodes?: NodeEntity[];
}

export class ZoneWithNodesModel {
  constructor(
    public readonly zone: ZoneEntity,
    public readonly nodes: NodeEntity[],
  ) { }
}

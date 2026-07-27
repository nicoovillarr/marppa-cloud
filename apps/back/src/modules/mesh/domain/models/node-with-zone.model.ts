import { NodeEntity } from '../entities/node.entity';
import { ZoneEntity } from '../entities/zone.entity';

export class NodeWithZoneModel {
  constructor(
    public readonly node: NodeEntity,
    public readonly zone: ZoneEntity,
  ) { }
}

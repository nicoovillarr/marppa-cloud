import { NodeEntity } from '@/mesh/domain/entities/node.entity';
import { AtomImageEntity } from '../entities/atom-image.entity';
import { AtomEntity } from '../entities/atom.entity';

export class AtomWithRelationsModel {
  constructor(
    public readonly atom: AtomEntity,
    public readonly image: AtomImageEntity,
    public readonly node: NodeEntity | null,
  ) { }
}

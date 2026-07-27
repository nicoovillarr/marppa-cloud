import { Atom, AtomImage, Node } from '@prisma/client';
import { AtomWithRelationsModel } from '@/nucleus/domain/models/atom-with-relations.model';
import { NodePrismaMapper } from '@/mesh/infrastructure/mappers/node.prisma-mapper';
import { AtomImagePrismaMapper } from './atom-image.prisma-mapper';
import { AtomPrismaMapper } from './atom.prisma-mapper';

type AtomWithRelationsPrismaModel = Atom & {
  image: AtomImage;
  node: Node | null;
};

export class AtomWithRelationsPrismaMapper {
  static toDomain(raw: AtomWithRelationsPrismaModel): AtomWithRelationsModel {
    return new AtomWithRelationsModel(
      AtomPrismaMapper.toEntity(raw),
      AtomImagePrismaMapper.toEntity(raw.image),
      raw.node ? NodePrismaMapper.toEntity(raw.node) : null,
    );
  }
}

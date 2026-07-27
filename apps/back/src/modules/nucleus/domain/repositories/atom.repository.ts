import { AtomEntity } from '../entities/atom.entity';
import { AtomWithRelationsModel } from '../models/atom-with-relations.model';

export const ATOM_REPOSITORY_SYMBOL = Symbol('ATOM_REPOSITORY');

export abstract class AtomRepository {
  abstract findById(id: string): Promise<AtomEntity | null>;
  abstract findByIdWithRelations(id: string): Promise<AtomWithRelationsModel | null>;
  abstract findByOwnerId(ownerId: string): Promise<AtomWithRelationsModel[]>;
  abstract create(atom: AtomEntity): Promise<AtomEntity>;
  abstract update(atom: AtomEntity): Promise<AtomEntity>;
  abstract delete(id: string): Promise<void>;
}

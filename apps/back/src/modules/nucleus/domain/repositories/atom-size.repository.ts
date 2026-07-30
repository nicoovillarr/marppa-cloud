import { AtomSizeEntity } from '../entities/atom-size.entity';

export const ATOM_SIZE_REPOSITORY_SYMBOL = Symbol('ATOM_SIZE_REPOSITORY');

export abstract class AtomSizeRepository {
  abstract findById(id: number): Promise<AtomSizeEntity | null>;
  abstract findAll(includeDeprecated: boolean): Promise<AtomSizeEntity[]>;
  abstract findMaxVersion(name: string): Promise<number>;
  abstract create(atomSize: AtomSizeEntity): Promise<AtomSizeEntity>;
  abstract deprecate(id: number, deprecatedAt: Date): Promise<void>;
  abstract restore(id: number): Promise<void>;
}

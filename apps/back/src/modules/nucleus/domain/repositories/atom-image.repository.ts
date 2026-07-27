import { AtomImageEntity } from '../entities/atom-image.entity';

export const ATOM_IMAGE_REPOSITORY_SYMBOL = Symbol('ATOM_IMAGE_REPOSITORY');

export abstract class AtomImageRepository {
  abstract findById(id: number): Promise<AtomImageEntity | null>;
  abstract findAll(): Promise<AtomImageEntity[]>;
}

import { AtomImageEntity } from '../entities/atom-image.entity';

export const ATOM_IMAGE_REPOSITORY_SYMBOL = Symbol('ATOM_IMAGE_REPOSITORY');

export abstract class AtomImageRepository {
  abstract findById(id: number): Promise<AtomImageEntity | null>;
  abstract findAll(): Promise<AtomImageEntity[]>;
  abstract findAvailableFor(companyIds: string[]): Promise<AtomImageEntity[]>;
  abstract create(image: AtomImageEntity): Promise<AtomImageEntity>;
  abstract update(image: AtomImageEntity): Promise<AtomImageEntity>;
  abstract delete(id: number): Promise<void>;
  abstract countAtoms(id: number): Promise<number>;
}

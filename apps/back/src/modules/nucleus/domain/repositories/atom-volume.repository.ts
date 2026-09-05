import { AtomVolumeEntity } from '../entities/atom-volume.entity';

export const ATOM_VOLUME_REPOSITORY_SYMBOL = Symbol('ATOM_VOLUME_REPOSITORY');

export abstract class AtomVolumeRepository {
  abstract findById(id: number): Promise<AtomVolumeEntity | null>;
  abstract findByOwnerIds(ownerIds: string[]): Promise<AtomVolumeEntity[]>;
  abstract findByAtomId(atomId: string): Promise<AtomVolumeEntity[]>;
  abstract create(volume: AtomVolumeEntity): Promise<AtomVolumeEntity>;
  abstract update(volume: AtomVolumeEntity): Promise<AtomVolumeEntity>;
  abstract delete(id: number): Promise<void>;
}

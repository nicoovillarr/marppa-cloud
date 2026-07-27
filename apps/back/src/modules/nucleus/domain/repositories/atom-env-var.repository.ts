import { AtomEnvVarModel } from '../models/atom-env-var.model';

export const ATOM_ENV_VAR_REPOSITORY_SYMBOL = Symbol('ATOM_ENV_VAR_REPOSITORY');

export abstract class AtomEnvVarRepository {
  abstract findByAtomId(atomId: string): Promise<AtomEnvVarModel[]>;
  abstract findById(id: number): Promise<AtomEnvVarModel | null>;
  abstract upsert(
    atomId: string,
    key: string,
    value: string,
    userId: string,
  ): Promise<AtomEnvVarModel>;
  abstract delete(id: number): Promise<void>;
}

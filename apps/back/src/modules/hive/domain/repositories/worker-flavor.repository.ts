import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';
import { WorkerFlavorWithFamilyModel } from '../models/worker-flavor-with-family.model';

export const WORKER_FLAVOR_REPOSITORY_SYMBOL = Symbol(
  'WORKER_FLAVOR_REPOSITORY',
);

export abstract class WorkerFlavorRepository {
  abstract findById(id: number): Promise<WorkerFlavorEntity | null>;
  abstract findByIdWithFamily(
    id: number,
  ): Promise<WorkerFlavorWithFamilyModel | null>;
  abstract findAll(includeDeprecated: boolean): Promise<WorkerFlavorEntity[]>;
  abstract findMaxVersion(familyId: number, name: string): Promise<number>;
  abstract create(
    workerFlavor: WorkerFlavorEntity,
  ): Promise<WorkerFlavorEntity>;
  abstract deprecate(id: number, deprecatedAt: Date): Promise<void>;
}

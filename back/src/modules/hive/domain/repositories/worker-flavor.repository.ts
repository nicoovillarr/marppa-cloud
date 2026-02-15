import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';

export const WORKER_FLAVOR_REPOSITORY_SYMBOL = Symbol(
  'WORKER_FLAVOR_REPOSITORY',
);

export abstract class WorkerFlavorRepository {
  abstract findById(id: number): Promise<WorkerFlavorEntity | null>;
  abstract create(
    workerFlavor: WorkerFlavorEntity,
  ): Promise<WorkerFlavorEntity>;
  abstract update(
    workerFlavor: WorkerFlavorEntity,
  ): Promise<WorkerFlavorEntity>;
  abstract delete(id: number): Promise<void>;
}

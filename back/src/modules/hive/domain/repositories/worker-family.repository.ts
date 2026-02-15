import { WorkerFamilyEntity } from '../entities/worker-family.entity';

export const WORKER_FAMILY_REPOSITORY_SYMBOL = Symbol(
  'WORKER_FAMILY_REPOSITORY',
);

export abstract class WorkerFamilyRepository {
  abstract findById(id: number): Promise<WorkerFamilyEntity | null>;
  abstract create(
    workerFamily: WorkerFamilyEntity,
  ): Promise<WorkerFamilyEntity>;
  abstract update(
    workerFamily: WorkerFamilyEntity,
  ): Promise<WorkerFamilyEntity>;
  abstract delete(id: number): Promise<void>;
}

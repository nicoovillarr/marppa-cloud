import { WorkerFamilyEntity } from '../entities/worker-family.entity';
import { WorkerFamilyWithFlavorsModel } from '../models/worker-family-with-flavors.model';

export const WORKER_FAMILY_REPOSITORY_SYMBOL = Symbol(
  'WORKER_FAMILY_REPOSITORY',
);

export abstract class WorkerFamilyRepository {
  abstract findAll(): Promise<WorkerFamilyWithFlavorsModel[]>;
  abstract findById(id: number): Promise<WorkerFamilyEntity | null>;
  abstract create(
    workerFamily: WorkerFamilyEntity,
  ): Promise<WorkerFamilyEntity>;
  abstract update(
    workerFamily: WorkerFamilyEntity,
  ): Promise<WorkerFamilyEntity>;
  abstract delete(id: number): Promise<void>;
}

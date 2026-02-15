import { WorkerStorageTypeEntity } from '../entities/worker-storage-type.entity';

export const WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL = Symbol(
  'WORKER_STORAGE_TYPE_REPOSITORY',
);

export abstract class WorkerStorageTypeRepository {
  abstract findById(id: number): Promise<WorkerStorageTypeEntity | null>;
  abstract create(
    workerStorageType: WorkerStorageTypeEntity,
  ): Promise<WorkerStorageTypeEntity>;
  abstract update(
    workerStorageType: WorkerStorageTypeEntity,
  ): Promise<WorkerStorageTypeEntity>;
  abstract delete(id: number): Promise<void>;
}

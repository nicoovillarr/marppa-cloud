import { WorkerStorageTypeEntity } from "../entities/worker-storage-type.entity";

export const WORKER_STORAGE_TYPE_SYMBOL = Symbol('WORKER_STORAGE_TYPE_REPOSITORY');

export abstract class WorkerStorageTypeRepository {
  abstract create(workerStorageType: WorkerStorageTypeEntity): Promise<WorkerStorageTypeEntity>;
  abstract update(workerStorageType: WorkerStorageTypeEntity): Promise<WorkerStorageTypeEntity>;
  abstract delete(workerStorageType: WorkerStorageTypeEntity): Promise<void>;
  abstract findById(id: string): Promise<WorkerStorageTypeEntity | null>;
  abstract findByOwnerId(ownerId: string): Promise<WorkerStorageTypeEntity[]>;
}
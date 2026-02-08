import { WorkerDiskEntity } from "../entities/worker-disk.entity";

export const WORKER_DISK_REPOSITORY_SYMBOL = Symbol('WORKER_DISK_REPOSITORY');

export abstract class WorkerDiskRepository {
  abstract findById(id: number): Promise<WorkerDiskEntity | null>;
  abstract findByOwnerId(ownerId: string): Promise<WorkerDiskEntity[]>;
  abstract create(workerDisk: WorkerDiskEntity): Promise<WorkerDiskEntity>;
  abstract update(workerDisk: WorkerDiskEntity): Promise<WorkerDiskEntity>;
  abstract delete(id: number): Promise<void>;
}
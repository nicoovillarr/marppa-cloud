import { WorkerImageEntity } from "../entities/worker-image.entity";

export const WORKER_IMAGE_REPOSITORY_SYMBOL = Symbol('WORKER_IMAGE_REPOSITORY');

export abstract class WorkerImageRepository {
  abstract create(workerImage: WorkerImageEntity): Promise<WorkerImageEntity>;
  abstract update(workerImage: WorkerImageEntity): Promise<WorkerImageEntity>;
  abstract delete(workerImage: WorkerImageEntity): Promise<void>;
  abstract findById(id: string): Promise<WorkerImageEntity | null>;
  abstract findByOwnerId(ownerId: string): Promise<WorkerImageEntity[]>;
}
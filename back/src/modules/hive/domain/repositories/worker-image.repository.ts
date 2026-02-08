import { WorkerImageEntity } from "../entities/worker-image.entity";

export const WORKER_IMAGE_REPOSITORY_SYMBOL = Symbol('WORKER_IMAGE_REPOSITORY');

export abstract class WorkerImageRepository {
  abstract findById(id: number): Promise<WorkerImageEntity | null>;
  abstract create(workerImage: WorkerImageEntity): Promise<WorkerImageEntity>;
  abstract update(workerImage: WorkerImageEntity): Promise<WorkerImageEntity>;
  abstract delete(id: number): Promise<void>;
}
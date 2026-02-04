import { WorkerMmiEntity } from "../entities/worker-mmi.entity";

export const WORKER_MMI_REPOSITORY_SYMBOL = Symbol('WORKER_MMI_REPOSITORY');

export abstract class WorkerMmiRepository {
  abstract create(workerMmi: WorkerMmiEntity): Promise<WorkerMmiEntity>;
  abstract update(workerMmi: WorkerMmiEntity): Promise<WorkerMmiEntity>;
  abstract delete(workerMmi: WorkerMmiEntity): Promise<void>;
  abstract findById(id: string): Promise<WorkerMmiEntity | null>;
  abstract findByOwnerId(ownerId: string): Promise<WorkerMmiEntity[]>;
}
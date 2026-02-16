import { WorkerEntity } from '../entities/worker.entity';
import { WorkerWithRelationsModel } from '../models/worker-with-relations.model';

export const WORKER_REPOSITORY_SYMBOL = Symbol('WORKER_REPOSITORY');

export abstract class WorkerRepository {
  abstract findById(id: string): Promise<WorkerEntity | null>;
  abstract findByIdWithRelations(id: string): Promise<WorkerWithRelationsModel | null>;
  abstract findByOwnerId(ownerId: string): Promise<WorkerWithRelationsModel[]>;
  abstract create(worker: WorkerEntity): Promise<WorkerEntity>;
  abstract update(worker: WorkerEntity): Promise<WorkerEntity>;
  abstract delete(id: string): Promise<void>;
}

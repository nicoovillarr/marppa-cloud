import { WorkerMmiFamilyEntity } from "../entities/worker-mmi-family.entity";

export const WORKER_MMI_FAMILY_REPOSITORY_SYMBOL = Symbol('WORKER_MMI_FAMILY_REPOSITORY');

export abstract class WorkerMmiFamilyRepository {
  abstract create(workerMmiFamily: WorkerMmiFamilyEntity): Promise<WorkerMmiFamilyEntity>;
  abstract update(workerMmiFamily: WorkerMmiFamilyEntity): Promise<WorkerMmiFamilyEntity>;
  abstract delete(workerMmiFamily: WorkerMmiFamilyEntity): Promise<void>;
  abstract findById(id: string): Promise<WorkerMmiFamilyEntity | null>;
  abstract findByOwnerId(ownerId: string): Promise<WorkerMmiFamilyEntity[]>;
}
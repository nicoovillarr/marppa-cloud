import { WorkerSshKeyModel } from '../models/worker-ssh-key.model';

export const WORKER_SSH_KEY_REPOSITORY_SYMBOL = Symbol(
  'WORKER_SSH_KEY_REPOSITORY',
);

export abstract class WorkerSshKeyRepository {
  abstract findByWorkerId(workerId: string): Promise<WorkerSshKeyModel[]>;
  abstract findById(id: number): Promise<WorkerSshKeyModel | null>;
  abstract create(
    workerId: string,
    name: string,
    publicKey: string,
    createdBy: string,
  ): Promise<WorkerSshKeyModel>;
  abstract delete(id: number): Promise<void>;
}

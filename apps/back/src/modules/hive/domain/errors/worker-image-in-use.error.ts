import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class WorkerImageInUseError extends ConflictError {
  constructor(name: string, workerCount: number) {
    super(
      `Worker image "${name}" still backs ${workerCount} worker(s): delete them before removing the image`,
    );
  }
}

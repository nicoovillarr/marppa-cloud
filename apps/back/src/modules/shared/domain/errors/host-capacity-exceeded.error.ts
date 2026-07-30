import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class HostCapacityExceededError extends ConflictError {
  constructor(resource: string, requested: number, available: number, unit: string) {
    super(
      `Not enough ${resource} on the host: ${requested}${unit} requested, ${available}${unit} available`,
    );
  }
}

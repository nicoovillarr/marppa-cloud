import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class CompanyCycleError extends ConflictError {
  constructor(name: string) {
    super(`"${name}" cannot be moved under one of its own descendants`);
  }
}

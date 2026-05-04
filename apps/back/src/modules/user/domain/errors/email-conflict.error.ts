import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class EmailConflictError extends ConflictError {
  constructor() {
    super('Email already in use');
  }
}

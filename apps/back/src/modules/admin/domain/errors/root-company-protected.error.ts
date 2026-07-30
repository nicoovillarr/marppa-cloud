import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class RootCompanyProtectedError extends ConflictError {
  constructor() {
    super('The root company anchors platform administration and cannot be deleted or reparented');
  }
}

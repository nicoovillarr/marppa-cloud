import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class CompanyParentRequiredError extends ConflictError {
  constructor() {
    super('A company must hang off a parent: only the root company has none, and it is the one that grants platform administration');
  }
}

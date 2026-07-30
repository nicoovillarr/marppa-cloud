import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class CompanyNotEmptyError extends ConflictError {
  constructor(name: string) {
    super(`Company "${name}" still owns users or resources: remove them before deleting it`);
  }
}

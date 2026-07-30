import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class RootCompanyMissingError extends ConflictError {
  constructor() {
    super('No root company exists to hang the new company off; seed the database first');
  }
}

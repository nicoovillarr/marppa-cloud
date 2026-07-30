import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class LastOwnerProtectedError extends ConflictError {
  constructor(companyName: string) {
    super(`"${companyName}" would be left without an owner`);
  }
}

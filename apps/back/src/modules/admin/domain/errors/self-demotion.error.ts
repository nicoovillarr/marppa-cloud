import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class SelfDemotionError extends ConflictError {
  constructor() {
    super('You cannot demote or delete your own account from the admin dashboard');
  }
}

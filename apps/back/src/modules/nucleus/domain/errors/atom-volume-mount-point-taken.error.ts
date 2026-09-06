import { ConflictError } from '@/shared/domain/errors/conflict.error';

export class AtomVolumeMountPointTakenError extends ConflictError {
  constructor(mountPoint: string, atomId: string) {
    super(`Atom ${atomId} already has a volume mounted at ${mountPoint}`);
  }
}

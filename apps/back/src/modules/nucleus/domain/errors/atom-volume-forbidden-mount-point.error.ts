import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class AtomVolumeForbiddenMountPointError extends ForbiddenError {
  constructor(mountPoint: string) {
    super(`Mount point ${mountPoint} cannot host a volume`);
  }
}

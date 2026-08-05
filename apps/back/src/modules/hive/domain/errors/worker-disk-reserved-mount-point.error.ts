import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

export class WorkerDiskReservedMountPointError extends ForbiddenError {
  constructor(mountPoint: string) {
    super(
      `Mount point ${mountPoint} belongs to the guest OS and cannot host a volume`,
    );
  }
}

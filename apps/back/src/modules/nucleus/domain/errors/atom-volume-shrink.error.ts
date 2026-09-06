import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class AtomVolumeShrinkError extends BadRequestError {
  constructor(currentGiB: number, requestedGiB: number) {
    super(
      `A volume can only grow: ${requestedGiB}GiB is not larger than the ` +
      `current ${currentGiB}GiB`,
    );
  }
}

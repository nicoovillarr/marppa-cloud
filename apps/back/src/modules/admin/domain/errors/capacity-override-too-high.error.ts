import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class CapacityOverrideTooHighError extends BadRequestError {
  constructor(resource: string, requested: number, reported: number) {
    super(
      `The ${resource} override (${requested}) exceeds what the host reported (${reported}): an override reserves headroom, it cannot invent hardware`,
    );
  }
}

import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class AtomImageForbiddenCapabilityError extends BadRequestError {
  constructor(capabilities: string[]) {
    super(
      `Capabilities that are never granted cannot be approved on an image: ${capabilities.join(', ')}`,
    );
  }
}

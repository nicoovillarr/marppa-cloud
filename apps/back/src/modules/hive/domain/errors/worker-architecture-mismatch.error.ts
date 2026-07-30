import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class WorkerArchitectureMismatchError extends BadRequestError {
  constructor(imageArchitecture: string, familyArchitecture: string) {
    super(
      `Image architecture (${imageArchitecture}) does not match the flavor family architecture (${familyArchitecture})`,
    );
  }
}

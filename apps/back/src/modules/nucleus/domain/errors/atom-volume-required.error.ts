import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class AtomVolumeRequiredError extends BadRequestError {
  constructor(imageName: string, dataPath: string) {
    super(
      `Image ${imageName} keeps its state in ${dataPath}, so the atom needs a ` +
      'volume: without one it writes into the container layer and loses ' +
      'everything on the next start',
    );
  }
}

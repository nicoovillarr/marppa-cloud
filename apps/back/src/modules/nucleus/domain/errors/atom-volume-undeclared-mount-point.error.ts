import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

export class AtomVolumeUndeclaredMountPointError extends BadRequestError {
  constructor(mountPoint: string, imageName: string, dataPaths: string[]) {
    super(
      dataPaths.length
        ? `Image ${imageName} keeps its state in ${dataPaths.join(', ')}, ` +
          `so it cannot take a volume on ${mountPoint}`
        : `Image ${imageName} declares no data paths, so it cannot take a volume`,
    );
  }
}

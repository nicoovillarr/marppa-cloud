import { Inject, Injectable } from '@nestjs/common';
import {
  ATOM_IMAGE_REPOSITORY_SYMBOL,
  AtomImageRepository,
} from '../repositories/atom-image.repository';
import { AtomImageEntity } from '../entities/atom-image.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateAtomImageDto } from '@/nucleus/presentation/dtos/create-atom-image.dto';
import { UpdateAtomImageDto } from '@/nucleus/presentation/dtos/update-atom-image.dto';
import { AtomImageInUseError } from '../errors/atom-image-in-use.error';
import { AtomImageForbiddenCapabilityError } from '../errors/atom-image-forbidden-capability.error';
import { forbiddenCapabilities } from '@marppa-cloud/shared';

const DEFAULT_REGISTRY = 'docker.io';
const DEFAULT_ARCHITECTURE = 'amd64';

@Injectable()
export class AtomImageService {
  constructor(
    @Inject(ATOM_IMAGE_REPOSITORY_SYMBOL)
    private readonly repository: AtomImageRepository,
  ) { }

  async findById(id: number): Promise<AtomImageEntity> {
    const image = await this.repository.findById(id);
    if (!image) {
      throw new NotFoundError();
    }

    return image;
  }

  findAll(): Promise<AtomImageEntity[]> {
    return this.repository.findAll();
  }

  create(data: CreateAtomImageDto): Promise<AtomImageEntity> {
    this.assertCapabilitiesGrantable(data.capabilities);

    const image = new AtomImageEntity(
      data.name,
      data.registry ?? DEFAULT_REGISTRY,
      data.repository,
      data.tag,
      data.architecture ?? DEFAULT_ARCHITECTURE,
      data.defaultSizeId,
      {
        description: data.description,
        digest: data.digest,
        capabilities: data.capabilities,
        sysctls: data.sysctls,
        command: data.command,
        requiredEnvVars: data.requiredEnvVars,
      },
    );

    return this.repository.create(image);
  }

  async update(
    id: number,
    data: UpdateAtomImageDto,
  ): Promise<AtomImageEntity> {
    this.assertCapabilitiesGrantable(data.capabilities);

    const image = await this.findById(id);

    return this.repository.update(
      image.clone({
        name: data.name,
        registry: data.registry,
        repository: data.repository,
        tag: data.tag,
        architecture: data.architecture,
        defaultSizeId: data.defaultSizeId,
        description: data.description,
        digest: data.digest,
        capabilities: data.capabilities,
        sysctls: data.sysctls,
        command: data.command,
        requiredEnvVars: data.requiredEnvVars,
      }),
    );
  }

  async delete(id: number): Promise<void> {
    const image = await this.findById(id);

    const atomCount = await this.repository.countAtoms(id);
    if (atomCount > 0) {
      throw new AtomImageInUseError(image.name, atomCount);
    }

    await this.repository.delete(id);
  }

  private assertCapabilitiesGrantable(capabilities?: string[]): void {
    const forbidden = forbiddenCapabilities(capabilities ?? []);
    if (forbidden.length) {
      throw new AtomImageForbiddenCapabilityError(forbidden);
    }
  }
}

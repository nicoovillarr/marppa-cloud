import { Inject, Injectable } from '@nestjs/common';
import {
  ATOM_IMAGE_REPOSITORY_SYMBOL,
  AtomImageRepository,
} from '../repositories/atom-image.repository';
import { AtomImageEntity } from '../entities/atom-image.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';

/**
 * The catalog is read-only over HTTP on purpose: an Atom may only run an image
 * that already exists here, and rows are added by the seed (or a migration), so
 * approving an image is a deliberate, reviewed change and never an API call.
 */
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
}

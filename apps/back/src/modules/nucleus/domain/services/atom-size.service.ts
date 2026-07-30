import { Inject, Injectable } from '@nestjs/common';
import {
  ATOM_SIZE_REPOSITORY_SYMBOL,
  AtomSizeRepository,
} from '../repositories/atom-size.repository';
import { AtomSizeEntity } from '../entities/atom-size.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateAtomSizeDto } from '@/nucleus/presentation/dtos/create-atom-size.dto';
import { UpdateAtomSizeDto } from '@/nucleus/presentation/dtos/update-atom-size.dto';
import { AtomSizeAlreadyExistsError } from '../errors/atom-size-already-exists.error';
import { AtomSizeDeprecatedError } from '../errors/atom-size-deprecated.error';

@Injectable()
export class AtomSizeService {
  constructor(
    @Inject(ATOM_SIZE_REPOSITORY_SYMBOL)
    private readonly atomSizeRepository: AtomSizeRepository,
  ) { }

  async findById(id: number): Promise<AtomSizeEntity> {
    const atomSize = await this.atomSizeRepository.findById(id);
    if (!atomSize) {
      throw new NotFoundError();
    }

    return atomSize;
  }

  async findAll(includeDeprecated = false): Promise<AtomSizeEntity[]> {
    return this.atomSizeRepository.findAll(includeDeprecated);
  }

  async create(data: CreateAtomSizeDto): Promise<AtomSizeEntity> {
    const previousVersion = await this.atomSizeRepository.findMaxVersion(
      data.name,
    );

    if (previousVersion > 0) {
      throw new AtomSizeAlreadyExistsError(data.name);
    }

    return this.atomSizeRepository.create(
      new AtomSizeEntity(data.name, data.cpuCores, data.ramMB, {
        pricePerHourCents: data.pricePerHourCents,
      }),
    );
  }

  async revise(id: number, data: UpdateAtomSizeDto): Promise<AtomSizeEntity> {
    const current = await this.findById(id);
    if (current.isDeprecated) {
      throw new AtomSizeDeprecatedError(current.name);
    }

    const latestVersion = await this.atomSizeRepository.findMaxVersion(
      current.name,
    );

    const created = await this.atomSizeRepository.create(
      new AtomSizeEntity(current.name, data.cpuCores, data.ramMB, {
        version: latestVersion + 1,
        pricePerHourCents: data.pricePerHourCents ?? current.pricePerHourCents,
      }),
    );

    await this.atomSizeRepository.deprecate(current.id!, new Date());

    return created;
  }

  async restore(id: number): Promise<void> {
    const current = await this.findById(id);
    if (!current.isDeprecated) {
      return;
    }

    await this.atomSizeRepository.restore(current.id!);
  }

  async deprecate(id: number): Promise<void> {
    const current = await this.findById(id);
    if (current.isDeprecated) {
      return;
    }

    await this.atomSizeRepository.deprecate(current.id!, new Date());
  }
}

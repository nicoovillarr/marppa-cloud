import { Inject, Injectable } from '@nestjs/common';
import { WorkerFlavorRepository } from '../repositories/worker-flavor.repository';
import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerFlavorDto } from '@/hive/presentation/dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '@/hive/presentation/dtos/update-worker-flavor.dto';
import { WORKER_FLAVOR_REPOSITORY_SYMBOL } from '../repositories/worker-flavor.repository';
import { WorkerFlavorWithFamilyModel } from '../models/worker-flavor-with-family.model';
import { WorkerFlavorAlreadyExistsError } from '../errors/worker-flavor-already-exists.error';
import { WorkerFlavorDeprecatedError } from '../errors/worker-flavor-deprecated.error';

@Injectable()
export class WorkerFlavorService {
  constructor(
    @Inject(WORKER_FLAVOR_REPOSITORY_SYMBOL)
    private readonly workerFlavorRepository: WorkerFlavorRepository,
  ) { }

  async findById(id: number): Promise<WorkerFlavorEntity> {
    const workerFlavor = await this.workerFlavorRepository.findById(id);
    if (!workerFlavor) {
      throw new NotFoundError();
    }

    return workerFlavor;
  }

  async findByIdWithFamily(id: number): Promise<WorkerFlavorWithFamilyModel> {
    const model = await this.workerFlavorRepository.findByIdWithFamily(id);
    if (!model) {
      throw new NotFoundError();
    }

    return model;
  }

  async findAll(includeDeprecated = false): Promise<WorkerFlavorEntity[]> {
    return this.workerFlavorRepository.findAll(includeDeprecated);
  }

  async createWorkerFlavor(
    data: CreateWorkerFlavorDto,
  ): Promise<WorkerFlavorEntity> {
    const previousVersion = await this.workerFlavorRepository.findMaxVersion(
      data.familyId,
      data.name,
    );

    if (previousVersion > 0) {
      throw new WorkerFlavorAlreadyExistsError(data.name);
    }

    return this.workerFlavorRepository.create(
      new WorkerFlavorEntity(
        data.name,
        data.cpuCores,
        data.ramMB,
        data.familyId,
        {
          pricePerHourCents: data.pricePerHourCents,
        },
      ),
    );
  }

  async reviseWorkerFlavor(
    id: number,
    data: UpdateWorkerFlavorDto,
  ): Promise<WorkerFlavorEntity> {
    const current = await this.findById(id);
    if (current.isDeprecated) {
      throw new WorkerFlavorDeprecatedError(current.name);
    }

    const latestVersion = await this.workerFlavorRepository.findMaxVersion(
      current.familyId,
      current.name,
    );

    const revision = new WorkerFlavorEntity(
      current.name,
      data.cpuCores,
      data.ramMB,
      current.familyId,
      {
        version: latestVersion + 1,
        pricePerHourCents: data.pricePerHourCents ?? current.pricePerHourCents,
      },
    );

    const created = await this.workerFlavorRepository.create(revision);
    await this.workerFlavorRepository.deprecate(current.id!, new Date());

    return created;
  }

  async deprecateWorkerFlavor(id: number): Promise<void> {
    const current = await this.findById(id);
    if (current.isDeprecated) {
      return;
    }

    await this.workerFlavorRepository.deprecate(current.id!, new Date());
  }
}

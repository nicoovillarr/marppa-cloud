import { Inject, Injectable } from '@nestjs/common';
import { WorkerFlavorRepository } from '../repositories/worker-flavor.repository';
import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerFlavorDto } from '@/hive/presentation/dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '@/hive/presentation/dtos/update-worker-flavor.dto';
import { WORKER_FLAVOR_REPOSITORY_SYMBOL } from '../repositories/worker-flavor.repository';

@Injectable()
export class WorkerFlavorService {
  constructor(
    @Inject(WORKER_FLAVOR_REPOSITORY_SYMBOL)
    private readonly workerFlavorRepository: WorkerFlavorRepository,
  ) {}

  async findById(id: number): Promise<WorkerFlavorEntity> {
    const workerFlavor = await this.workerFlavorRepository.findById(id);
    if (!workerFlavor) {
      throw new NotFoundError();
    }

    return workerFlavor;
  }

  async createWorkerFlavor(
    data: CreateWorkerFlavorDto,
  ): Promise<WorkerFlavorEntity> {
    const entity = new WorkerFlavorEntity(
      data.name,
      data.cpuCores,
      data.ramMB,
      data.diskGB,
      data.familyId,
    );

    return this.save(entity);
  }

  async updateWorkerFlavor(
    id: number,
    data: UpdateWorkerFlavorDto,
  ): Promise<WorkerFlavorEntity> {
    const entity = await this.findById(id);
    const updated = entity.clone({
      name: data.name,
      cpuCores: data.cpuCores,
      ramMB: data.ramMB,
      diskGB: data.diskGB,
      familyId: data.familyId,
    });

    return this.save(updated);
  }

  deleteWorkerFlavor(id: number): Promise<void> {
    return this.workerFlavorRepository.delete(id);
  }

  private save(data: WorkerFlavorEntity): Promise<WorkerFlavorEntity> {
    if (data.id == null) {
      return this.workerFlavorRepository.create(data);
    }

    return this.workerFlavorRepository.update(data);
  }
}

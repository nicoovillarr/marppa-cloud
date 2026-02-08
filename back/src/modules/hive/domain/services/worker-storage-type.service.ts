import { Inject, Injectable } from "@nestjs/common";
import { WorkerStorageTypeRepository, WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL } from "../repositories/worker-storage-type.repository";
import { WorkerStorageTypeEntity } from "../entities/worker-storage-type.entity";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { CreateWorkerStorageTypeDto } from "@/hive/presentation/dtos/create-worker-storage-type.dto";
import { UpdateWorkerStorageTypeDto } from "@/hive/presentation/dtos/update-worker-storage-type.dto";

@Injectable()
export class WorkerStorageTypeService {
  constructor(
    @Inject(WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL)
    private readonly workerStorageTypeRepository: WorkerStorageTypeRepository,
  ) { }

  async findById(id: number): Promise<WorkerStorageTypeEntity> {
    const workerStorageType = await this.workerStorageTypeRepository.findById(id);
    if (!workerStorageType) {
      throw new NotFoundError();
    }

    return workerStorageType;
  }

  async createWorkerStorageType(data: CreateWorkerStorageTypeDto): Promise<WorkerStorageTypeEntity> {
    const entity = new WorkerStorageTypeEntity(
      data.name,
      data.persistent,
      data.attachable,
      data.shared,
      {
        description: data.description,
      }
    );

    return this.save(entity);
  }

  async updateWorkerStorageType(id: number, data: UpdateWorkerStorageTypeDto): Promise<WorkerStorageTypeEntity> {
    const entity = await this.findById(id);
    const updated = entity.clone({
      name: data.name,
      persistent: data.persistent,
      attachable: data.attachable,
      shared: data.shared,
      description: data.description,
    });

    return this.save(updated);
  }

  deleteWorkerStorageType(id: number): Promise<void> {
    return this.workerStorageTypeRepository.delete(id);
  }

  private save(data: WorkerStorageTypeEntity): Promise<WorkerStorageTypeEntity> {
    if (data.id == null) {
      return this.workerStorageTypeRepository.create(data);
    }

    return this.workerStorageTypeRepository.update(data);
  }
}
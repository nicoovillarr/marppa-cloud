import { Inject, Injectable } from "@nestjs/common";
import { WorkerImageRepository, WORKER_IMAGE_REPOSITORY_SYMBOL } from "../repositories/worker-image.repository";
import { WorkerImageEntity } from "../entities/worker-image.entity";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { CreateWorkerImageDto } from "@/hive/presentation/dtos/create-worker-image.dto";
import { UpdateWorkerImageDto } from "@/hive/presentation/dtos/update-worker-image.dto";

@Injectable()
export class WorkerImageService {
  constructor(
    @Inject(WORKER_IMAGE_REPOSITORY_SYMBOL)
    private readonly workerImageRepository: WorkerImageRepository,
  ) { }

  async findById(id: number): Promise<WorkerImageEntity> {
    const workerImage = await this.workerImageRepository.findById(id);
    if (!workerImage) {
      throw new NotFoundError();
    }

    return workerImage;
  }

  async create(data: CreateWorkerImageDto): Promise<WorkerImageEntity> {
    const workerImage = new WorkerImageEntity(
      data.name,
      data.osType,
      data.osFamily,
      data.imageUrl,
      data.architecture,
      data.virtualizationType,
      {
        description: data.description,
        osVersion: data.osVersion,
        workerStorageTypeId: data.workerStorageTypeId,
      }
    );

    return this.save(workerImage);
  }

  async update(id: number, data: UpdateWorkerImageDto): Promise<WorkerImageEntity> {
    const workerImage = await this.findById(id);

    workerImage.clone({
      name: data.name,
      osType: data.osType,
      osFamily: data.osFamily,
      imageUrl: data.imageUrl,
      architecture: data.architecture,
      virtualizationType: data.virtualizationType,
      description: data.description,
      osVersion: data.osVersion,
      workerStorageTypeId: data.workerStorageTypeId,
    });

    return this.save(workerImage);
  }

  delete(id: number): Promise<void> {
    return this.workerImageRepository.delete(id);
  }

  private save(data: WorkerImageEntity): Promise<WorkerImageEntity> {
    if (data.id == null) {
      return this.workerImageRepository.create(data);
    }

    return this.workerImageRepository.update(data);
  }
}
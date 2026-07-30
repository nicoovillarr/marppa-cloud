import { WorkerImageService } from '@/hive/domain/services/worker-image.service';
import { Injectable } from '@nestjs/common';
import { WorkerImageResponseModel } from '../models/worker-image.response-model';
import { plainToInstance } from 'class-transformer';
import { CreateWorkerImageDto } from '@/hive/presentation/dtos/create-worker-image.dto';
import { UpdateWorkerImageDto } from '@/hive/presentation/dtos/update-worker-image.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class WorkerImageApiService {
  constructor(
    private readonly service: WorkerImageService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  async findById(id: number): Promise<WorkerImageResponseModel> {
    const workerImage = await this.service.findById(id);
    return plainToInstance(WorkerImageResponseModel, workerImage, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<WorkerImageResponseModel[]> {
    const workerImages = await this.service.findAll();
    return plainToInstance(WorkerImageResponseModel, workerImages, {
      excludeExtraneousValues: true,
    });
  }

  async create(data: CreateWorkerImageDto): Promise<WorkerImageResponseModel> {
    const workerImage = await this.service.create(data);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_IMAGE_CREATE,
      primary: { type: 'WorkerImage', id: workerImage.id!.toString() },
    });

    return plainToInstance(WorkerImageResponseModel, workerImage, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: number,
    data: UpdateWorkerImageDto,
  ): Promise<WorkerImageResponseModel> {
    const workerImage = await this.service.update(id, data);

    return plainToInstance(WorkerImageResponseModel, workerImage, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}

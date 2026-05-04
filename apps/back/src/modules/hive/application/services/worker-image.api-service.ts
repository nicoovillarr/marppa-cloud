import { WorkerImageService } from '@/hive/domain/services/worker-image.service';
import { Injectable } from '@nestjs/common';
import { WorkerImageResponseModel } from '../models/worker-image.response-model';
import { plainToInstance } from 'class-transformer';
import { CreateWorkerImageDto } from '@/hive/presentation/dtos/create-worker-image.dto';
import { UpdateWorkerImageDto } from '@/hive/presentation/dtos/update-worker-image.dto';
import { EventService } from '@/event/domain/services/event.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class WorkerImageApiService {
  constructor(
    private readonly service: WorkerImageService,
    private readonly eventService: EventService,
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

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.WORKER_IMAGE_CREATE,
    });

    await this.eventService.addEventResource(
      eventId!,
      'WorkerImage',
      workerImage.id!.toString(),
    );

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

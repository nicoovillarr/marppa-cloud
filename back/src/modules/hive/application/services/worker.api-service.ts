import { WorkerService } from "@/hive/domain/services/worker.service";
import { CreateWorkerDto } from "@/hive/presentation/dtos/create-worker.dto";
import { UpdateWorkerDto } from "@/hive/presentation/dtos/update-worker.dto";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { WorkerResponseModel } from "../models/worker.response-model";
import { EventService } from "@/event/domain/services/event.service";
import { EventTypeKey } from "@/event/domain/enums/event-type-key.enum";

@Injectable()
export class WorkerApiService {
  constructor(
    private readonly service: WorkerService,
    private readonly eventService: EventService,
  ) { }

  public async findById(id: string): Promise<WorkerResponseModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async findByOwnerId(ownerId: string): Promise<WorkerResponseModel[]> {
    const entities = await this.service.findByOwnerId(ownerId);
    return plainToInstance(WorkerResponseModel, entities, { excludeExtraneousValues: true });
  }

  public async create(data: CreateWorkerDto): Promise<WorkerResponseModel> {
    const entity = await this.service.createWorker(data);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.WORKER_CREATE,
    });

    await this.eventService.addEventResource(eventId!, 'Worker', entity.id!);

    return plainToInstance(WorkerResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async start(id: string): Promise<void> {
    await this.service.startWorker(id);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.WORKER_START,
    });

    await this.eventService.addEventResource(eventId!, 'Worker', id);
  }

  public async terminate(id: string): Promise<void> {
    await this.service.stopWorker(id);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.WORKER_TERMINATE,
    });

    await this.eventService.addEventResource(eventId!, 'Worker', id);
  }

  public async update(id: string, data: UpdateWorkerDto): Promise<WorkerResponseModel> {
    const entity = await this.service.updateWorker(id, data);
    return plainToInstance(WorkerResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async delete(id: string): Promise<void> {
    await this.service.deleteWorker(id);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.WORKER_DELETE,
    });

    await this.eventService.addEventResource(eventId!, 'Worker', id);
  }
}

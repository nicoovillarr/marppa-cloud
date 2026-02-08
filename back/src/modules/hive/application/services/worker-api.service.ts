import { WorkerService } from "@/hive/domain/services/worker.service";
import { CreateWorkerDto } from "@/hive/presentation/dtos/create-worker.dto";
import { UpdateWorkerDto } from "@/hive/presentation/dtos/update-worker.dto";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { WorkerModel } from "../models/worker.model";

@Injectable()
export class WorkerApiService {
  constructor(
    private readonly service: WorkerService,
  ) { }

  async findById(id: string): Promise<WorkerModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerModel, entity, { excludeExtraneousValues: true });
  }

  async findByOwnerId(ownerId: string): Promise<WorkerModel[]> {
    const entities = await this.service.findByOwnerId(ownerId);
    return plainToInstance(WorkerModel, entities, { excludeExtraneousValues: true });
  }

  async create(data: CreateWorkerDto): Promise<WorkerModel> {
    const entity = await this.service.createWorker(data);
    return plainToInstance(WorkerModel, entity, { excludeExtraneousValues: true });
  }

  async update(id: string, data: UpdateWorkerDto): Promise<WorkerModel> {
    const entity = await this.service.updateWorker(id, data);
    return plainToInstance(WorkerModel, entity, { excludeExtraneousValues: true });
  }

  async delete(id: string): Promise<void> {
    await this.service.deleteWorker(id);
  }
}

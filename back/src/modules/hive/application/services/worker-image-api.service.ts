import { WorkerImageService } from "@/hive/domain/services/worker-image.service";
import { Injectable } from "@nestjs/common";
import { WorkerImageModel } from "../models/worker-image.model";
import { plainToInstance } from "class-transformer";
import { CreateWorkerImageDto } from "@/hive/presentation/dtos/create-worker-image.dto";
import { UpdateWorkerImageDto } from "@/hive/presentation/dtos/update-worker-image.dto";

@Injectable()
export class WorkerImageApiService {
  constructor(
    private readonly service: WorkerImageService,
  ) { }

  async findById(id: number): Promise<WorkerImageModel> {
    const workerImage = await this.service.findById(id);
    return plainToInstance(WorkerImageModel, workerImage, { excludeExtraneousValues: true });
  }

  async create(data: CreateWorkerImageDto): Promise<WorkerImageModel> {
    const workerImage = await this.service.create(data);
    return plainToInstance(WorkerImageModel, workerImage, { excludeExtraneousValues: true });
  }

  async update(id: number, data: UpdateWorkerImageDto): Promise<WorkerImageModel> {
    const workerImage = await this.service.update(id, data);
    return plainToInstance(WorkerImageModel, workerImage, { excludeExtraneousValues: true });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}
import { WorkerStorageTypeService } from "@/hive/domain/services/worker-storage-type.service";
import { CreateWorkerStorageTypeDto } from "@/hive/presentation/dtos/create-worker-storage-type.dto";
import { UpdateWorkerStorageTypeDto } from "@/hive/presentation/dtos/update-worker-storage-type.dto";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { WorkerStorageTypeResponseModel } from "../models/worker-storage-type.response-model";

@Injectable()
export class WorkerStorageTypeApiService {
  constructor(
    private readonly service: WorkerStorageTypeService,
  ) { }

  async findById(id: number): Promise<WorkerStorageTypeResponseModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerStorageTypeResponseModel, entity, { excludeExtraneousValues: true });
  }

  async create(data: CreateWorkerStorageTypeDto): Promise<WorkerStorageTypeResponseModel> {
    const entity = await this.service.createWorkerStorageType(data);
    return plainToInstance(WorkerStorageTypeResponseModel, entity, { excludeExtraneousValues: true });
  }

  async update(id: number, data: UpdateWorkerStorageTypeDto): Promise<WorkerStorageTypeResponseModel> {
    const entity = await this.service.updateWorkerStorageType(id, data);
    return plainToInstance(WorkerStorageTypeResponseModel, entity, { excludeExtraneousValues: true });
  }

  async delete(id: number): Promise<void> {
    await this.service.deleteWorkerStorageType(id);
  }
}
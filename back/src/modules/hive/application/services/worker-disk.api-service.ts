import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

import { WorkerDiskService } from "../../domain/services/worker-disk.service";
import { WorkerDiskResponseModel } from "../models/worker-disk.response-model";
import { CreateWorkerDiskDto } from "@/hive/presentation/dtos/create-worker-disk.dto";
import { UpdateWorkerDiskDto } from "@/hive/presentation/dtos/update-worker-disk.dto";

@Injectable()
export class WorkerDiskApiService {
  constructor(
    private readonly service: WorkerDiskService,
  ) { }

  async findById(id: number): Promise<WorkerDiskResponseModel> {
    const workerDisk = await this.service.findById(id);
    return plainToInstance(WorkerDiskResponseModel, workerDisk, { excludeExtraneousValues: true });
  }

  async findByOwnerId(ownerId: string): Promise<WorkerDiskResponseModel[]> {
    const list = await this.service.findByOwnerId(ownerId);
    return list.map(
      x => plainToInstance(WorkerDiskResponseModel, x, { excludeExtraneousValues: true })
    )
  }

  async create(data: CreateWorkerDiskDto): Promise<WorkerDiskResponseModel> {
    const workerDisk = await this.service.create(data);
    return plainToInstance(WorkerDiskResponseModel, workerDisk, { excludeExtraneousValues: true });
  }

  async update(id: number, data: UpdateWorkerDiskDto): Promise<WorkerDiskResponseModel> {
    const workerDisk = await this.service.update(id, data);
    return plainToInstance(WorkerDiskResponseModel, workerDisk, { excludeExtraneousValues: true });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}
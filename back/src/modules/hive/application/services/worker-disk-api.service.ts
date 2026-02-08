import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

import { WorkerDiskService } from "../../domain/services/worker-disk.service";
import { WorkerDiskModel } from "../models/worker-disk.model";
import { CreateWorkerDiskDto } from "@/hive/presentation/dtos/create-worker-disk.dto";
import { UpdateWorkerDiskDto } from "@/hive/presentation/dtos/update-worker-disk.dto";

@Injectable()
export class WorkerDiskApiService {
  constructor(
    private readonly service: WorkerDiskService,
  ) { }

  async findById(id: number): Promise<WorkerDiskModel> {
    const workerDisk = await this.service.findById(id);
    return plainToInstance(WorkerDiskModel, workerDisk, { excludeExtraneousValues: true });
  }

  async findByOwnerId(ownerId: string): Promise<WorkerDiskModel[]> {
    const list = await this.service.findByOwnerId(ownerId);
    return list.map(
      x => plainToInstance(WorkerDiskModel, x, { excludeExtraneousValues: true })
    )
  }

  async create(data: CreateWorkerDiskDto): Promise<WorkerDiskModel> {
    const workerDisk = await this.service.create(data);
    return plainToInstance(WorkerDiskModel, workerDisk, { excludeExtraneousValues: true });
  }

  async update(id: number, data: UpdateWorkerDiskDto): Promise<WorkerDiskModel> {
    const workerDisk = await this.service.update(id, data);
    return plainToInstance(WorkerDiskModel, workerDisk, { excludeExtraneousValues: true });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}
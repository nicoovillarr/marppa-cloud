import { WorkerFlavorService } from "@/hive/domain/services/worker-flavor.service";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { WorkerFlavorModel } from "../models/worker-flavor.model";
import { CreateWorkerFlavorDto } from "@/hive/presentation/dtos/create-worker-flavor.dto";
import { UpdateWorkerFlavorDto } from "@/hive/presentation/dtos/update-worker-flavor.dto";

@Injectable()
export class WorkerFlavorApiService {
  constructor(
    private readonly service: WorkerFlavorService,
  ) { }

  async findById(id: number): Promise<WorkerFlavorModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerFlavorModel, entity, { excludeExtraneousValues: true });
  }

  async create(data: CreateWorkerFlavorDto): Promise<WorkerFlavorModel> {
    const entity = await this.service.createWorkerFlavor(data);
    return plainToInstance(WorkerFlavorModel, entity, { excludeExtraneousValues: true });
  }

  async update(id: number, data: UpdateWorkerFlavorDto): Promise<WorkerFlavorModel> {
    const entity = await this.service.updateWorkerFlavor(id, data);
    return plainToInstance(WorkerFlavorModel, entity, { excludeExtraneousValues: true });
  }

  async delete(id: number): Promise<void> {
    await this.service.deleteWorkerFlavor(id);
  }
}
import { WorkerFamilyService } from "@/hive/domain/services/worker-family.service";
import { Injectable } from "@nestjs/common";
import { WorkerFamilyModel } from "../models/worker-family.model";
import { plainToInstance } from "class-transformer";
import { CreateWorkerFamilyDto } from "@/hive/presentation/dtos/create-worker-family.dto";
import { UpdateWorkerFamilyDto } from "@/hive/presentation/dtos/update-worker-family.dto";

@Injectable()
export class WorkerFamilyApiService {
  constructor(
    private readonly service: WorkerFamilyService,
  ) { }

  async findById(id: number): Promise<WorkerFamilyModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerFamilyModel, entity, { excludeExtraneousValues: true });
  }

  async create(data: CreateWorkerFamilyDto): Promise<WorkerFamilyModel> {
    const entity = await this.service.create(data);
    return plainToInstance(WorkerFamilyModel, entity, { excludeExtraneousValues: true });
  }

  async update(id: number, data: UpdateWorkerFamilyDto): Promise<WorkerFamilyModel> {
    const entity = await this.service.update(id, data);
    return plainToInstance(WorkerFamilyModel, entity, { excludeExtraneousValues: true });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}
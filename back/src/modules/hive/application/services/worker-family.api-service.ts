import { WorkerFamilyService } from '@/hive/domain/services/worker-family.service';
import { Injectable } from '@nestjs/common';
import { WorkerFamilyResponseModel } from '../models/worker-family.response-model';
import { plainToInstance } from 'class-transformer';
import { CreateWorkerFamilyDto } from '@/hive/presentation/dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '@/hive/presentation/dtos/update-worker-family.dto';

@Injectable()
export class WorkerFamilyApiService {
  constructor(private readonly service: WorkerFamilyService) {}

  async findById(id: number): Promise<WorkerFamilyResponseModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerFamilyResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    data: CreateWorkerFamilyDto,
  ): Promise<WorkerFamilyResponseModel> {
    const entity = await this.service.create(data);
    return plainToInstance(WorkerFamilyResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: number,
    data: UpdateWorkerFamilyDto,
  ): Promise<WorkerFamilyResponseModel> {
    const entity = await this.service.update(id, data);
    return plainToInstance(WorkerFamilyResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}

import { WorkerFamilyService } from '@/hive/domain/services/worker-family.service';
import { Injectable } from '@nestjs/common';
import { WorkerFamilyResponseModel } from '../models/worker-family.response-model';
import { plainToInstance } from 'class-transformer';
import { CreateWorkerFamilyDto } from '@/hive/presentation/dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '@/hive/presentation/dtos/update-worker-family.dto';
import { WorkerFamilyWithFlavorsResponseModel } from '../models/worker-family-with-flavors.response-model';
import { WorkerFlavorResponseModel } from '../models/worker-flavor.response-model';
import { mergeDto } from '@/shared/application/utils/merge-dto.utils';

@Injectable()
export class WorkerFamilyApiService {
  constructor(private readonly service: WorkerFamilyService) { }

  async findAll(): Promise<WorkerFamilyWithFlavorsResponseModel[]> {
    const list = await this.service.findAll();

    return list.map(data => {
      const family = plainToInstance(WorkerFamilyResponseModel, data.family, { excludeExtraneousValues: true });
      const flavors = data.flavors.map(flavor => plainToInstance(WorkerFlavorResponseModel, flavor, { excludeExtraneousValues: true }));

      return mergeDto(
        WorkerFamilyWithFlavorsResponseModel,
        family,
        {
          flavors
        },
      );
    });
  }

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

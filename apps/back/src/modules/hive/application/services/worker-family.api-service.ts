import { WorkerFamilyService } from '@/hive/domain/services/worker-family.service';
import { Injectable } from '@nestjs/common';
import { WorkerFamilyResponseModel } from '../models/worker-family.response-model';
import { plainToInstance } from 'class-transformer';
import { CreateWorkerFamilyDto } from '@/hive/presentation/dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '@/hive/presentation/dtos/update-worker-family.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { WorkerFamilyWithFlavorsResponseModel } from '../models/worker-family-with-flavors.response-model';
import { WorkerFlavorResponseModel } from '../models/worker-flavor.response-model';
import { mergeDto } from '@/shared/application/utils/merge-dto.utils';

@Injectable()
export class WorkerFamilyApiService {
  constructor(
    private readonly service: WorkerFamilyService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  async findAll(
    includeDeprecated = false,
  ): Promise<WorkerFamilyWithFlavorsResponseModel[]> {
    const list = await this.service.findAll(includeDeprecated);

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

  async restore(id: number): Promise<void> {
    await this.service.restore(id);

    const family = await this.service.findById(id);
    await this.audit(EventTypeKey.ADMIN_CATALOG_RESTORED, id, family.name);
  }

  async deprecate(id: number): Promise<void> {
    const family = await this.service.findById(id);
    await this.service.deprecate(id);
    await this.audit(EventTypeKey.ADMIN_CATALOG_DEPRECATED, id, family.name);
  }

  private audit(type: EventTypeKey, id: number, name: string): Promise<number> {
    return this.eventDispatch.record({
      type,
      primary: { type: 'WorkerFamily', id: String(id) },
      properties: { name },
    });
  }
}

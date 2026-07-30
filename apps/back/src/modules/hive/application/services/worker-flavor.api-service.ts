import { WorkerFlavorService } from '@/hive/domain/services/worker-flavor.service';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { WorkerFlavorResponseModel } from '../models/worker-flavor.response-model';
import { CreateWorkerFlavorDto } from '@/hive/presentation/dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '@/hive/presentation/dtos/update-worker-flavor.dto';

@Injectable()
export class WorkerFlavorApiService {
  constructor(
    private readonly service: WorkerFlavorService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  async findById(id: number): Promise<WorkerFlavorResponseModel> {
    const entity = await this.service.findById(id);
    return plainToInstance(WorkerFlavorResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(includeDeprecated = false): Promise<WorkerFlavorResponseModel[]> {
    const entities = await this.service.findAll(includeDeprecated);
    return plainToInstance(WorkerFlavorResponseModel, entities, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    data: CreateWorkerFlavorDto,
  ): Promise<WorkerFlavorResponseModel> {
    const entity = await this.service.createWorkerFlavor(data);
    return plainToInstance(WorkerFlavorResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  async revise(
    id: number,
    data: UpdateWorkerFlavorDto,
  ): Promise<WorkerFlavorResponseModel> {
    const entity = await this.service.reviseWorkerFlavor(id, data);
    return plainToInstance(WorkerFlavorResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  async restore(id: number): Promise<void> {
    await this.service.restoreWorkerFlavor(id);

    const flavor = await this.service.findById(id);
    await this.audit(EventTypeKey.ADMIN_CATALOG_RESTORED, id, flavor.name);
  }

  async deprecate(id: number): Promise<void> {
    const flavor = await this.service.findById(id);
    await this.service.deprecateWorkerFlavor(id);
    await this.audit(EventTypeKey.ADMIN_CATALOG_DEPRECATED, id, flavor.name);
  }

  private audit(type: EventTypeKey, id: number, name: string): Promise<number> {
    return this.eventDispatch.record({
      type,
      primary: { type: 'WorkerFlavor', id: String(id) },
      properties: { name },
    });
  }
}

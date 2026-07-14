import { WorkerService } from '@/hive/domain/services/worker.service';
import { CreateWorkerDto } from '@/hive/presentation/dtos/create-worker.dto';
import { UpdateWorkerDto } from '@/hive/presentation/dtos/update-worker.dto';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WorkerResponseModel } from '../models/worker.response-model';
import { WorkerWithRelationsResponseModel } from '../models/worker-with-relations.response-model';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { WorkerWithRelationsModel } from '@/hive/domain/models/worker-with-relations.model';
import { WorkerFlavorResponseModel } from '../models/worker-flavor.response-model';
import { NodeResponseModel } from '@/mesh/application/models/node.response-model';
import { mergeDto } from '@/shared/application/utils/merge-dto.utils';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';

@Injectable()
export class WorkerApiService {
  constructor(
    private readonly service: WorkerService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  public async findById(id: string): Promise<WorkerResponseModel> {
    const worker = await this.service.findById(id);
    return plainToInstance(WorkerResponseModel, worker, {
      excludeExtraneousValues: true,
    });
  }

  public async findByIdWithRelations(id: string): Promise<WorkerWithRelationsResponseModel> {
    const data = await this.service.findByIdWithRelations(id);

    const worker = plainToInstance(WorkerResponseModel, data.worker, { excludeExtraneousValues: true });
    const flavor = plainToInstance(WorkerFlavorResponseModel, data.flavor, { excludeExtraneousValues: true });
    const node = data.node ? plainToInstance(NodeResponseModel, data.node, { excludeExtraneousValues: true }) : null;

    return mergeDto(
      WorkerWithRelationsResponseModel,
      worker,
      {
        flavor,
        node,
      },
    );
  }

  public async findByOwnerId(
    ownerId?: string,
  ): Promise<WorkerWithRelationsResponseModel[]> {
    if (!ownerId) {
      const user = getCurrentUser();
      if (!user) {
        throw new UnauthorizedError();
      }

      ownerId = user.companyId;
    }

    const list = await this.service.findByOwnerId(ownerId);
    return list.map(data => {
      const worker = plainToInstance(WorkerResponseModel, data.worker, { excludeExtraneousValues: true });
      const flavor = plainToInstance(WorkerFlavorResponseModel, data.flavor, { excludeExtraneousValues: true });
      const node = data.node ? plainToInstance(NodeResponseModel, data.node, { excludeExtraneousValues: true }) : null;

      return mergeDto(
        WorkerWithRelationsResponseModel,
        worker,
        {
          flavor,
          node,
        },
      );
    });
  }

  public async create(data: CreateWorkerDto): Promise<WorkerResponseModel> {
    const entity = await this.service.createWorker(data);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_CREATE,
      primary: { type: 'Worker', id: entity.id! },
      properties: { PublicSSH: data.publicSSH },
    });

    return plainToInstance(WorkerResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async start(id: string): Promise<void> {
    await this.service.startWorker(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_START,
      primary: { type: 'Worker', id },
    });
  }

  public async terminate(id: string): Promise<void> {
    await this.service.stopWorker(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_TERMINATE,
      primary: { type: 'Worker', id },
    });
  }

  public async update(
    id: string,
    data: UpdateWorkerDto,
  ): Promise<WorkerResponseModel> {
    const entity = await this.service.updateWorker(id, data);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_UPDATE,
      primary: { type: 'Worker', id },
    });

    return plainToInstance(WorkerResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.service.deleteWorker(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_DELETE,
      primary: { type: 'Worker', id },
    });
  }
}

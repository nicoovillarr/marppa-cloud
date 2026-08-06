import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { WorkerDiskService } from '../../domain/services/worker-disk.service';
import { WorkerDiskResponseModel } from '../models/worker-disk.response-model';
import { CreateWorkerDiskDto } from '@/hive/presentation/dtos/create-worker-disk.dto';
import { UpdateWorkerDiskDto } from '@/hive/presentation/dtos/update-worker-disk.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { WorkerDiskEntity } from '@/hive/domain/entities/worker-disk.entity';

@Injectable()
export class WorkerDiskApiService {
  constructor(
    private readonly service: WorkerDiskService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  async findById(id: number): Promise<WorkerDiskResponseModel> {
    return this.toResponse(await this.service.findById(id));
  }

  async findByOwnerId(ownerId?: string): Promise<WorkerDiskResponseModel[]> {
    const list = await this.service.findByOwnerId(ownerId);
    return list.map((x) => this.toResponse(x));
  }

  async findByWorkerId(workerId: string): Promise<WorkerDiskResponseModel[]> {
    const list = await this.service.findByWorkerId(workerId);
    return list.map((x) => this.toResponse(x));
  }

  async create(data: CreateWorkerDiskDto): Promise<WorkerDiskResponseModel> {
    const entity = await this.service.create(data);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_DISK_CREATE,
      primary: { type: 'WorkerDisk', id: String(entity.id!) },
    });

    return this.toResponse(entity);
  }

  async update(
    id: number,
    data: UpdateWorkerDiskDto,
  ): Promise<WorkerDiskResponseModel> {
    return this.toResponse(await this.service.update(id, data));
  }

  async attach(id: number, workerId: string): Promise<void> {
    const worker = await this.service.attach(id, workerId);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_DISK_ATTACH,
      primary: { type: 'WorkerDisk', id: String(id) },
      parent: { type: 'Worker', id: worker.id! },
    });
  }

  async detach(id: number): Promise<void> {
    await this.service.detach(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_DISK_DETACH,
      primary: { type: 'WorkerDisk', id: String(id) },
    });
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_DISK_DELETE,
      primary: { type: 'WorkerDisk', id: String(id) },
    });
  }

  private toResponse(entity: WorkerDiskEntity): WorkerDiskResponseModel {
    return plainToInstance(WorkerDiskResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { FiberService } from '../../domain/services/fiber.service';
import { CreateFiberDto } from '../../presentation/dtos/create-fiber.dto';
import { plainToInstance } from 'class-transformer';
import { FiberResponseModel } from '../models/fiber.response-model';
import { NodeService } from '../../domain/services/node.service';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class FiberApiService {
  constructor(
    private readonly nodeService: NodeService,
    private readonly fiberService: FiberService,
    private readonly eventDispatch: EventDispatchService,
  ) {}

  public async findById(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<FiberResponseModel> {
    const entity = await this.fiberService.findById(zoneId, nodeId, fiberId);
    return plainToInstance(FiberResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async findByNodeId(
    zoneId: string,
    nodeId: string,
  ): Promise<FiberResponseModel[]> {
    const entities = await this.fiberService.findByNodeId(zoneId, nodeId);
    return plainToInstance(FiberResponseModel, entities, {
      excludeExtraneousValues: true,
    });
  }

  public async create(
    zoneId: string,
    nodeId: string,
    data: CreateFiberDto,
  ): Promise<FiberResponseModel> {
    const node = await this.nodeService.findById(zoneId, nodeId);
    if (node == null) {
      throw new NotFoundError();
    }

    const entity = await this.fiberService.create(nodeId, data);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.NODE_CREATE_FIBER,
      primary: { type: 'Fiber', id: entity.id!.toString() },
      parent: { type: 'Node', id: nodeId },
    });

    return plainToInstance(FiberResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<void> {
    await this.fiberService.delete(zoneId, nodeId, fiberId);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.NODE_DELETE_FIBER,
      primary: { type: 'Fiber', id: fiberId.toString() },
      parent: { type: 'Node', id: nodeId },
    });
  }
}

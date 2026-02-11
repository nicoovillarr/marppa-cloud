import { Injectable } from "@nestjs/common";
import { FiberService } from "../../domain/services/fiber.service";
import { CreateFiberDto } from "../../presentation/dtos/create-fiber.dto";
import { plainToInstance } from "class-transformer";
import { FiberResponseModel } from "../models/fiber.response-model";
import { NodeService } from "../../domain/services/node.service";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { EventService } from "@/event/domain/services/event.service";
import { EventTypeKey } from "@/event/domain/enums/event-type-key.enum";

@Injectable()
export class FiberApiService {
  constructor(
    private readonly nodeService: NodeService,
    private readonly fiberService: FiberService,
    private readonly eventService: EventService,
  ) { }

  public async findById(zoneId: string, nodeId: string, fiberId: number): Promise<FiberResponseModel> {
    const entity = await this.fiberService.findById(zoneId, nodeId, fiberId);
    return plainToInstance(FiberResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async findByNodeId(zoneId: string, nodeId: string): Promise<FiberResponseModel[]> {
    const entities = await this.fiberService.findByNodeId(zoneId, nodeId);
    return plainToInstance(FiberResponseModel, entities, { excludeExtraneousValues: true });
  }

  public async create(zoneId: string, nodeId: string, data: CreateFiberDto): Promise<FiberResponseModel> {
    const node = await this.nodeService.findById(zoneId, nodeId);
    if (node == null) {
      throw new NotFoundError();
    }

    const entity = await this.fiberService.create(nodeId, data);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.NODE_CREATE_FIBER,
    });

    await this.eventService.addEventResource(eventId!, 'Node', nodeId);
    await this.eventService.addEventResource(eventId!, 'Fiber', entity.id!.toString());

    return plainToInstance(FiberResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async delete(zoneId: string, nodeId: string, fiberId: number): Promise<void> {
    await this.fiberService.delete(zoneId, nodeId, fiberId);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.NODE_DELETE_FIBER,
    });

    await this.eventService.addEventResource(eventId!, 'Node', nodeId);
    await this.eventService.addEventResource(eventId!, 'Fiber', fiberId.toString());
  }
}
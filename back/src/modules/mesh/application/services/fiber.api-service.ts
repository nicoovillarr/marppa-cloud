import { Injectable } from "@nestjs/common";
import { FiberService } from "../../domain/services/fiber.service";
import { CreateFiberDto } from "../../presentation/dtos/create-fiber.dto";
import { plainToInstance } from "class-transformer";
import { FiberResponseModel } from "../models/fiber.response-model";
import { NodeService } from "../../domain/services/node.service";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";

@Injectable()
export class FiberApiService {
  constructor(
    private readonly nodeService: NodeService,
    private readonly fiberService: FiberService,
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
    return plainToInstance(FiberResponseModel, entity, { excludeExtraneousValues: true });
  }

  public delete(zoneId: string, nodeId: string, fiberId: number): Promise<void> {
    return this.fiberService.delete(zoneId, nodeId, fiberId);
  }
}
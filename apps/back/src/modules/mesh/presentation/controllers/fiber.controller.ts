import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { FiberApiService } from '../../application/services/fiber.api-service';
import { FiberResponseModel } from '../../application/models/fiber.response-model';
import { CreateFiberDto } from '../dtos/create-fiber.dto';

@Controller('mesh/zones/:zoneId/nodes/:nodeId/fibers')
export class FiberController {
  constructor(private readonly apiService: FiberApiService) { }

  @Get()
  public async findAll(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
  ): Promise<FiberResponseModel[]> {
    return this.apiService.findByNodeId(zoneId, nodeId);
  }

  @Post()
  public async create(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
    @Body() data: CreateFiberDto,
  ): Promise<FiberResponseModel> {
    return this.apiService.create(zoneId, nodeId, data);
  }

  @Get(':fiberId')
  public async findById(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
    @Param('fiberId') fiberId: string,
  ): Promise<FiberResponseModel> {
    return this.apiService.findById(zoneId, nodeId, Number(fiberId));
  }

  @Delete(':fiberId')
  public async delete(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
    @Param('fiberId') fiberId: string,
  ): Promise<void> {
    return this.apiService.delete(zoneId, nodeId, Number(fiberId));
  }

  @Post(':fiberId/stop')
  public async stop(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
    @Param('fiberId') fiberId: string,
  ): Promise<void> {
    return this.apiService.stop(zoneId, nodeId, Number(fiberId));
  }

  @Post(':fiberId/start')
  public async start(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
    @Param('fiberId') fiberId: string,
  ): Promise<void> {
    return this.apiService.start(zoneId, nodeId, Number(fiberId));
  }
}

import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { NodeApiService } from '../../application/services/node.api-service';
import { NodeResponseModel } from '../../application/models/node.response-model';
import { CreateNodeDto } from '../dtos/create-node.dto';

@Controller('mesh/zones/:zoneId/nodes')
export class NodeController {
  constructor(private readonly apiService: NodeApiService) { }

  @Get()
  public async findByZoneId(
    @Param('zoneId') zoneId: string,
  ): Promise<NodeResponseModel[]> {
    return this.apiService.findByZoneId(zoneId);
  }

  @Post()
  public async create(
    @Param('zoneId') zoneId: string,
    @Body() data: CreateNodeDto,
  ): Promise<NodeResponseModel> {
    return this.apiService.create(zoneId, data);
  }

  @Get(':nodeId')
  public async findById(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
  ): Promise<NodeResponseModel> {
    return this.apiService.findById(zoneId, nodeId);
  }

  @Delete(':nodeId')
  public async delete(
    @Param('zoneId') zoneId: string,
    @Param('nodeId') nodeId: string,
  ): Promise<void> {
    return this.apiService.delete(zoneId, nodeId);
  }
}

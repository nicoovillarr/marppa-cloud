import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ZoneApiService } from '../../application/services/zone.api-service';
import { ZoneResponseModel } from '../../application/models/zone.response-model';
import { CreateZoneDto } from '../dtos/create-zone.dto';
import { UpdateZoneDto } from '../dtos/update-zone.dto';
import { ZoneWithNodesAndFibersResponseModel } from '@/mesh/application/models/zone-with-nodes-and-fibers.response-model';
import { ZoneWithNodesResponseModel } from '@/mesh/application/models/zone-with-nodes.response.model';

@Controller('mesh/zones')
export class ZoneController {
  constructor(private readonly apiService: ZoneApiService) { }

  @Get()
  public async findByOwnerId(
    @Query('ownerId') ownerId?: string,
  ): Promise<ZoneWithNodesResponseModel[]> {
    return this.apiService.findByOwnerId(ownerId);
  }

  @Post()
  public async create(@Body() data: CreateZoneDto): Promise<ZoneResponseModel> {
    return this.apiService.create(data);
  }

  @Get(':id')
  public async findById(@Param('id') id: string): Promise<ZoneWithNodesAndFibersResponseModel> {
    return this.apiService.findById(id);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() data: UpdateZoneDto,
  ): Promise<ZoneResponseModel> {
    return this.apiService.update(id, data);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    return this.apiService.delete(id);
  }
}

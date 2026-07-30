import { WorkerFlavorResponseModel } from '@/hive/application/models/worker-flavor.response-model';
import { WorkerFlavorApiService } from '@/hive/application/services/worker-flavor.api-service';
import {
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Controller,
} from '@nestjs/common';
import { CreateWorkerFlavorDto } from '../dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '../dtos/update-worker-flavor.dto';

@Controller('hive/flavors')
export class WorkerFlavorController {
  constructor(private readonly service: WorkerFlavorApiService) { }

  @Get()
  async findAll(): Promise<WorkerFlavorResponseModel[]> {
    return await this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerFlavorResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(
    @Body() data: CreateWorkerFlavorDto,
  ): Promise<WorkerFlavorResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async revise(
    @Param('id') id: string,
    @Body() data: UpdateWorkerFlavorDto,
  ): Promise<WorkerFlavorResponseModel> {
    return await this.service.revise(Number(id), data);
  }

  @Delete(':id')
  async deprecate(@Param('id') id: string): Promise<void> {
    await this.service.deprecate(Number(id));
  }
}

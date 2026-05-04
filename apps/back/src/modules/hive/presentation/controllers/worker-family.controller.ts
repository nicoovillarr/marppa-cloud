import { WorkerFamilyResponseModel } from '@/hive/application/models/worker-family.response-model';
import { WorkerFamilyApiService } from '@/hive/application/services/worker-family.api-service';
import {
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Controller,
} from '@nestjs/common';
import { CreateWorkerFamilyDto } from '../dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '../dtos/update-worker-family.dto';
import { WorkerFamilyWithFlavorsResponseModel } from '@/hive/application/models/worker-family-with-flavors.response-model';

@Controller('hive/families')
export class WorkerFamilyController {
  constructor(private readonly service: WorkerFamilyApiService) { }

  @Get()
  async findAll(): Promise<WorkerFamilyWithFlavorsResponseModel[]> {
    return await this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<WorkerFamilyResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(
    @Body() data: CreateWorkerFamilyDto,
  ): Promise<WorkerFamilyResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() data: UpdateWorkerFamilyDto,
  ): Promise<WorkerFamilyResponseModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    await this.service.delete(Number(id));
  }
}

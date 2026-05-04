import { WorkerApiService } from '@/hive/application/services/worker.api-service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { CreateWorkerDto } from '../dtos/create-worker.dto';
import { UpdateWorkerDto } from '../dtos/update-worker.dto';
import { WorkerWithRelationsResponseModel } from '@/hive/application/models/worker-with-relations.response-model';
import { WorkerResponseModel } from '@/hive/application/models/worker.response-model';
import type { Response } from 'express';

@Controller('hive/workers')
export class WorkerController {
  constructor(private readonly service: WorkerApiService) { }

  @Get()
  async findByOwnerId(
    @Query('ownerId') ownerId?: string,
  ): Promise<WorkerWithRelationsResponseModel[]> {
    return await this.service.findByOwnerId(ownerId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerWithRelationsResponseModel> {
    return await this.service.findByIdWithRelations(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: CreateWorkerDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WorkerResponseModel> {
    const worker = await this.service.create(data);
    res.location(`/api/hive/worker/${worker.id}`);
    return worker;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateWorkerDto,
  ): Promise<WorkerResponseModel> {
    return await this.service.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }
}

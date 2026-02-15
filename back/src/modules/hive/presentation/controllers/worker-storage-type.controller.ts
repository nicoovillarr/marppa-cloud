import { WorkerStorageTypeApiService } from '@/hive/application/services/worker-storage-type.api-service';
import {
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Controller,
} from '@nestjs/common';
import { CreateWorkerStorageTypeDto } from '../dtos/create-worker-storage-type.dto';
import { UpdateWorkerStorageTypeDto } from '../dtos/update-worker-storage-type.dto';
import { WorkerStorageTypeResponseModel } from '@/hive/application/models/worker-storage-type.response-model';

@Controller('hive/storage-type')
export class WorkerStorageTypeController {
  constructor(private readonly service: WorkerStorageTypeApiService) {}

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<WorkerStorageTypeResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(
    @Body() data: CreateWorkerStorageTypeDto,
  ): Promise<WorkerStorageTypeResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateWorkerStorageTypeDto,
  ): Promise<WorkerStorageTypeResponseModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(Number(id));
  }
}

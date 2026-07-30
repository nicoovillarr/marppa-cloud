import { WorkerImageResponseModel } from '@/hive/application/models/worker-image.response-model';
import { WorkerImageApiService } from '@/hive/application/services/worker-image.api-service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateWorkerImageDto } from '../dtos/create-worker-image.dto';
import { UpdateWorkerImageDto } from '../dtos/update-worker-image.dto';
import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';

@Controller('hive/images')
export class WorkerImageController {
  constructor(private readonly service: WorkerImageApiService) { }

  @Get()
  async findAll(): Promise<WorkerImageResponseModel[]> {
    return await this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerImageResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  async create(
    @Body() data: CreateWorkerImageDto,
  ): Promise<WorkerImageResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  @UseGuards(PlatformAdminGuard)
  async update(
    @Param('id') id: string,
    @Body() data: UpdateWorkerImageDto,
  ): Promise<WorkerImageResponseModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(Number(id));
  }
}

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
  UseGuards,
} from '@nestjs/common';
import { CreateWorkerFamilyDto } from '../dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '../dtos/update-worker-family.dto';
import { WorkerFamilyWithFlavorsResponseModel } from '@/hive/application/models/worker-family-with-flavors.response-model';
import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';

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
  @UseGuards(PlatformAdminGuard)
  async create(
    @Body() data: CreateWorkerFamilyDto,
  ): Promise<WorkerFamilyResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  @UseGuards(PlatformAdminGuard)
  async update(
    @Param('id') id: number,
    @Body() data: UpdateWorkerFamilyDto,
  ): Promise<WorkerFamilyResponseModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  async deprecate(@Param('id') id: number): Promise<void> {
    await this.service.deprecate(Number(id));
  }
}

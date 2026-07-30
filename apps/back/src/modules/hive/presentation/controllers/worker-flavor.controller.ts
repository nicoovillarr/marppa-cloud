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
  UseGuards,
  Query,
} from '@nestjs/common';
import { CreateWorkerFlavorDto } from '../dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '../dtos/update-worker-flavor.dto';
import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { IncludeDeprecatedQuery } from '@/shared/presentation/dtos/include-deprecated.query';

@Controller('hive/flavors')
export class WorkerFlavorController {
  constructor(private readonly service: WorkerFlavorApiService) { }

  @Get()
  async findAll(
    @Query() query: IncludeDeprecatedQuery,
  ): Promise<WorkerFlavorResponseModel[]> {
    return await this.service.findAll(query.includeDeprecated);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerFlavorResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  async create(
    @Body() data: CreateWorkerFlavorDto,
  ): Promise<WorkerFlavorResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  @UseGuards(PlatformAdminGuard)
  async revise(
    @Param('id') id: string,
    @Body() data: UpdateWorkerFlavorDto,
  ): Promise<WorkerFlavorResponseModel> {
    return await this.service.revise(Number(id), data);
  }

  @Post(':id/restore')
  @UseGuards(PlatformAdminGuard)
  async restore(@Param('id') id: string): Promise<void> {
    await this.service.restore(Number(id));
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  async deprecate(@Param('id') id: string): Promise<void> {
    await this.service.deprecate(Number(id));
  }
}

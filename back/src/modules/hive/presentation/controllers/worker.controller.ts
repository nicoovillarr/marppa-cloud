import { WorkerModel } from "@/hive/application/models/worker.response-model";
import { WorkerApiService } from "@/hive/application/services/worker.api-service";
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CreateWorkerDto } from "../dtos/create-worker.dto";
import { UpdateWorkerDto } from "../dtos/update-worker.dto";

@Controller('hive/worker')
export class WorkerController {
  constructor(
    private readonly service: WorkerApiService,
  ) { }

  @Get()
  async findByOwnerId(@Query('ownerId') ownerId: string): Promise<WorkerModel[]> {
    return await this.service.findByOwnerId(ownerId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerModel> {
    return await this.service.findById(id);
  }

  @Post()
  async create(@Body() data: CreateWorkerDto): Promise<WorkerModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateWorkerDto): Promise<WorkerModel> {
    return await this.service.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }
}
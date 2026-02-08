import { WorkerImageModel } from "@/hive/application/models/worker-image.model";
import { WorkerImageApiService } from "@/hive/application/services/worker-image-api.service";
import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CreateWorkerImageDto } from "../dtos/create-worker-image.dto";
import { UpdateWorkerImageDto } from "../dtos/update-worker-image.dto";

@Controller('hive/image')
export class WorkerImageController {
  constructor(
    private readonly service: WorkerImageApiService,
  ) { }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerImageModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(@Body() data: CreateWorkerImageDto): Promise<WorkerImageModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateWorkerImageDto): Promise<WorkerImageModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(Number(id));
  }
}
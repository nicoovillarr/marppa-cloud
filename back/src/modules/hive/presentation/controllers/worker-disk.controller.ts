import { WorkerDiskModel } from "@/hive/application/models/worker-disk.response-model";
import { WorkerDiskApiService } from "@/hive/application/services/worker-disk.api-service";
import { Get, Param, Post, Body, Put, Delete, Controller } from "@nestjs/common";
import { CreateWorkerDiskDto } from "../dtos/create-worker-disk.dto";
import { UpdateWorkerDiskDto } from "../dtos/update-worker-disk.dto";

@Controller('hive/disk')
export class WorkerDiskController {
  constructor(
    private readonly service: WorkerDiskApiService,
  ) { }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WorkerDiskModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(@Body() data: CreateWorkerDiskDto): Promise<WorkerDiskModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateWorkerDiskDto): Promise<WorkerDiskModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(Number(id));
  }
}
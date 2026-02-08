import { WorkerFamilyModel } from "@/hive/application/models/worker-family.model";
import { WorkerFamilyApiService } from "@/hive/application/services/worker-family-api.service";
import { Get, Param, Post, Body, Put, Delete, Controller } from "@nestjs/common";
import { CreateWorkerFamilyDto } from "../dtos/create-worker-family.dto";
import { UpdateWorkerFamilyDto } from "../dtos/update-worker-family.dto";

@Controller('hive/family')
export class WorkerFamilyController {
  constructor(
    private readonly service: WorkerFamilyApiService,
  ) { }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<WorkerFamilyModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(@Body() data: CreateWorkerFamilyDto): Promise<WorkerFamilyModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: UpdateWorkerFamilyDto): Promise<WorkerFamilyModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    await this.service.delete(Number(id));
  }
}
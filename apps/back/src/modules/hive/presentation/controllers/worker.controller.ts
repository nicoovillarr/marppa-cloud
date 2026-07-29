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
  UseGuards,
} from '@nestjs/common';
import { CreateWorkerDto } from '../dtos/create-worker.dto';
import { UpdateWorkerDto } from '../dtos/update-worker.dto';
import { WorkerWithRelationsResponseModel } from '@/hive/application/models/worker-with-relations.response-model';
import { WorkerResponseModel } from '@/hive/application/models/worker.response-model';
import type { Response } from 'express';
import { WorkerSshKeyApiService } from '@/hive/application/services/worker-ssh-key.api-service';
import { WorkerSshKeyModel } from '@/hive/domain/models/worker-ssh-key.model';
import { CreateWorkerSshKeyDto } from '../dtos/create-worker-ssh-key.dto';
import { LoggedInGuard } from '@/auth/presentation/guards/logged-in.guard';

@Controller('hive/workers')
@UseGuards(LoggedInGuard)
export class WorkerController {
  constructor(
    private readonly service: WorkerApiService,
    private readonly sshKeyService: WorkerSshKeyApiService,
  ) { }

  @Get(':id/ssh-keys')
  async findSshKeys(@Param('id') id: string): Promise<WorkerSshKeyModel[]> {
    return this.sshKeyService.findByWorkerId(id);
  }

  @Post(':id/ssh-keys')
  async createSshKey(
    @Param('id') id: string,
    @Body() data: CreateWorkerSshKeyDto,
  ): Promise<WorkerSshKeyModel> {
    return this.sshKeyService.create(id, data);
  }

  @Delete(':id/ssh-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSshKey(
    @Param('id') id: string,
    @Param('keyId') keyId: string,
  ): Promise<void> {
    return this.sshKeyService.delete(id, Number(keyId));
  }

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

  @Post(':id/start')
  @HttpCode(HttpStatus.ACCEPTED)
  async start(@Param('id') id: string): Promise<void> {
    await this.service.start(id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.ACCEPTED)
  async terminate(@Param('id') id: string): Promise<void> {
    await this.service.terminate(id);
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

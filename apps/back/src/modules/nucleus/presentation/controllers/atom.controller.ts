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
import type { Response } from 'express';
import { AtomApiService } from '@/nucleus/application/services/atom.api-service';
import { AtomEnvVarApiService } from '@/nucleus/application/services/atom-env-var.api-service';
import { AtomResponseModel } from '@/nucleus/application/models/atom.response-model';
import { AtomWithRelationsResponseModel } from '@/nucleus/application/models/atom-with-relations.response-model';
import { AtomEnvVarModel } from '@/nucleus/domain/models/atom-env-var.model';
import { CreateAtomDto } from '../dtos/create-atom.dto';
import { UpdateAtomDto } from '../dtos/update-atom.dto';
import { CreateAtomEnvVarDto } from '../dtos/create-atom-env-var.dto';

@Controller('nucleus/atoms')
export class AtomController {
  constructor(
    private readonly service: AtomApiService,
    private readonly envVarService: AtomEnvVarApiService,
  ) { }

  @Get(':id/env-vars')
  async findEnvVars(@Param('id') id: string): Promise<AtomEnvVarModel[]> {
    return this.envVarService.findByAtomId(id);
  }

  @Put(':id/env-vars')
  async upsertEnvVar(
    @Param('id') id: string,
    @Body() data: CreateAtomEnvVarDto,
  ): Promise<AtomEnvVarModel> {
    return this.envVarService.upsert(id, data);
  }

  @Delete(':id/env-vars/:envVarId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEnvVar(
    @Param('id') id: string,
    @Param('envVarId') envVarId: string,
  ): Promise<void> {
    return this.envVarService.delete(id, Number(envVarId));
  }

  @Get()
  async findByOwnerId(
    @Query('ownerId') ownerId?: string,
  ): Promise<AtomWithRelationsResponseModel[]> {
    return await this.service.findByOwnerId(ownerId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<AtomWithRelationsResponseModel> {
    return await this.service.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: CreateAtomDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AtomResponseModel> {
    const atom = await this.service.create(data);
    res.location(`/api/nucleus/atoms/${atom.id}`);
    return atom;
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
    @Body() data: UpdateAtomDto,
  ): Promise<AtomResponseModel> {
    return await this.service.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }
}

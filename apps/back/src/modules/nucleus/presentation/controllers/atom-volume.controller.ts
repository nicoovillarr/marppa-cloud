import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AtomVolumeApiService } from '@/nucleus/application/services/atom-volume.api-service';
import { AtomVolumeResponseModel } from '@/nucleus/application/models/atom-volume.response-model';
import { CreateAtomVolumeDto } from '../dtos/create-atom-volume.dto';
import { UpdateAtomVolumeDto } from '../dtos/update-atom-volume.dto';
import { AttachAtomVolumeDto } from '../dtos/attach-atom-volume.dto';
import { ResizeAtomVolumeDto } from '../dtos/resize-atom-volume.dto';

@Controller('nucleus/volumes')
export class AtomVolumeController {
  constructor(private readonly service: AtomVolumeApiService) { }

  @Get()
  async findByOwnerId(
    @Query('ownerId') ownerId?: string,
  ): Promise<AtomVolumeResponseModel[]> {
    return await this.service.findByOwnerId(ownerId);
  }

  @Get('atom/:atomId')
  async findByAtomId(
    @Param('atomId') atomId: string,
  ): Promise<AtomVolumeResponseModel[]> {
    return await this.service.findByAtomId(atomId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<AtomVolumeResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  async create(
    @Body() data: CreateAtomVolumeDto,
  ): Promise<AtomVolumeResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateAtomVolumeDto,
  ): Promise<AtomVolumeResponseModel> {
    return await this.service.update(Number(id), data);
  }

  @Post(':id/resize')
  async resize(
    @Param('id') id: string,
    @Body() data: ResizeAtomVolumeDto,
  ): Promise<AtomVolumeResponseModel> {
    return await this.service.resize(Number(id), data);
  }

  @Post(':id/attach')
  async attach(
    @Param('id') id: string,
    @Body() data: AttachAtomVolumeDto,
  ): Promise<AtomVolumeResponseModel> {
    return await this.service.attach(Number(id), data.atomId, data.mountPoint);
  }

  @Post(':id/detach')
  async detach(@Param('id') id: string): Promise<AtomVolumeResponseModel> {
    return await this.service.detach(Number(id));
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(Number(id));
  }
}

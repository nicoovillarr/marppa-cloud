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
import { AtomImageApiService } from '@/nucleus/application/services/atom-image.api-service';
import { AtomImageResponseModel } from '@/nucleus/application/models/atom-image.response-model';
import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { CreateAtomImageDto } from '../dtos/create-atom-image.dto';
import { UpdateAtomImageDto } from '../dtos/update-atom-image.dto';

@Controller('nucleus/images')
export class AtomImageController {
  constructor(private readonly service: AtomImageApiService) { }

  @Get()
  async findAll(): Promise<AtomImageResponseModel[]> {
    return await this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<AtomImageResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  async create(
    @Body() data: CreateAtomImageDto,
  ): Promise<AtomImageResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  @UseGuards(PlatformAdminGuard)
  async update(
    @Param('id') id: string,
    @Body() data: UpdateAtomImageDto,
  ): Promise<AtomImageResponseModel> {
    return await this.service.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(Number(id));
  }
}

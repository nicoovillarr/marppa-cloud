import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AtomSizeApiService } from '@/nucleus/application/services/atom-size.api-service';
import { AtomSizeResponseModel } from '@/nucleus/application/models/atom-size.response-model';
import { CreateAtomSizeDto } from '../dtos/create-atom-size.dto';
import { UpdateAtomSizeDto } from '../dtos/update-atom-size.dto';
import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { IncludeDeprecatedQuery } from '@/shared/presentation/dtos/include-deprecated.query';

@Controller('nucleus/sizes')
export class AtomSizeController {
  constructor(private readonly service: AtomSizeApiService) { }

  @Get()
  async findAll(
    @Query() query: IncludeDeprecatedQuery,
  ): Promise<AtomSizeResponseModel[]> {
    return await this.service.findAll(query.includeDeprecated);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<AtomSizeResponseModel> {
    return await this.service.findById(Number(id));
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  async create(
    @Body() data: CreateAtomSizeDto,
  ): Promise<AtomSizeResponseModel> {
    return await this.service.create(data);
  }

  @Put(':id')
  @UseGuards(PlatformAdminGuard)
  async revise(
    @Param('id') id: string,
    @Body() data: UpdateAtomSizeDto,
  ): Promise<AtomSizeResponseModel> {
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

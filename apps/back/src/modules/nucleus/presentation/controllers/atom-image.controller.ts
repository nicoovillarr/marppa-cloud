import { Controller, Get, Param } from '@nestjs/common';
import { AtomImageApiService } from '@/nucleus/application/services/atom-image.api-service';
import { AtomImageResponseModel } from '@/nucleus/application/models/atom-image.response-model';

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
}

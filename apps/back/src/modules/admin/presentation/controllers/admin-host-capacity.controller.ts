import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';

import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { AdminApiService } from '@/admin/application/services/admin.api-service';
import { AdminHostCapacityResponse } from '@/admin/application/models/admin.response';
import { UpsertHostCapacityDto } from '../dtos/upsert-host-capacity.dto';

@Controller('admin/hosts')
@UseGuards(PlatformAdminGuard)
export class AdminHostCapacityController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(): Promise<AdminHostCapacityResponse[]> {
    return this.service.findHosts();
  }

  @Put(':hostname')
  upsert(
    @Param('hostname') hostname: string,
    @Body() data: UpsertHostCapacityDto,
  ): Promise<AdminHostCapacityResponse> {
    return this.service.upsertHost(hostname, data);
  }

  @Delete(':hostname')
  delete(@Param('hostname') hostname: string): Promise<void> {
    return this.service.deleteHost(hostname);
  }
}

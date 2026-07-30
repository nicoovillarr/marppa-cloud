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
import { UpdateHostCapacityDto } from '../dtos/update-host-capacity.dto';

@Controller('admin/hosts')
@UseGuards(PlatformAdminGuard)
export class AdminHostCapacityController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(): Promise<AdminHostCapacityResponse[]> {
    return this.service.findHosts();
  }

  @Put(':hostname')
  updateOverride(
    @Param('hostname') hostname: string,
    @Body() data: UpdateHostCapacityDto,
  ): Promise<AdminHostCapacityResponse> {
    return this.service.updateHostOverride(hostname, data);
  }

  @Delete(':hostname')
  delete(@Param('hostname') hostname: string): Promise<void> {
    return this.service.deleteHost(hostname);
  }
}

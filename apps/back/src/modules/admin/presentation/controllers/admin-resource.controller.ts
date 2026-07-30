import { Controller, Get, UseGuards } from '@nestjs/common';

import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { AdminApiService } from '@/admin/application/services/admin.api-service';
import { AdminResourceResponse } from '@/admin/application/models/admin.response';

@Controller('admin/resources')
@UseGuards(PlatformAdminGuard)
export class AdminResourceController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(): Promise<AdminResourceResponse[]> {
    return this.service.findResources();
  }
}

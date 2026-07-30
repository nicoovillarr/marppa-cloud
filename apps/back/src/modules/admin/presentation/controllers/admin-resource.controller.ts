import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { AdminApiService } from '@/admin/application/services/admin.api-service';
import { AdminResourceResponse } from '@/admin/application/models/admin.response';
import { AdminResourceQuery } from '../dtos/admin-resource.query';
import { PaginatedResponse } from '@/shared/presentation/dtos/paginated.response';

@Controller('admin/resources')
@UseGuards(PlatformAdminGuard)
export class AdminResourceController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(
    @Query() query: AdminResourceQuery,
  ): Promise<PaginatedResponse<AdminResourceResponse>> {
    return this.service.findResources(query);
  }
}

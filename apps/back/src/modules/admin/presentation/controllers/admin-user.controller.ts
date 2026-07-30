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

import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { AdminApiService } from '@/admin/application/services/admin.api-service';
import { AdminUserResponse } from '@/admin/application/models/admin.response';
import { PaginationQuery } from '@/shared/presentation/dtos/pagination.query';
import { PaginatedResponse } from '@/shared/presentation/dtos/paginated.response';
import { CreateAdminUserDto } from '../dtos/create-admin-user.dto';
import { UpdateAdminUserDto } from '../dtos/update-admin-user.dto';

@Controller('admin/users')
@UseGuards(PlatformAdminGuard)
export class AdminUserController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedResponse<AdminUserResponse>> {
    return this.service.findUsers(query);
  }

  @Post()
  create(@Body() data: CreateAdminUserDto): Promise<AdminUserResponse> {
    return this.service.createUser(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateAdminUserDto,
  ): Promise<AdminUserResponse> {
    return this.service.updateUser(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.service.deleteUser(id);
  }
}

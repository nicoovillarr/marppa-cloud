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

import { PlatformAdminGuard } from '@/shared/presentation/guards/platform-admin.guard';
import { AdminApiService } from '@/admin/application/services/admin.api-service';
import { AdminUserResponse } from '@/admin/application/models/admin.response';
import { CreateAdminUserDto } from '../dtos/create-admin-user.dto';
import { UpdateAdminUserDto } from '../dtos/update-admin-user.dto';

@Controller('admin/users')
@UseGuards(PlatformAdminGuard)
export class AdminUserController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(): Promise<AdminUserResponse[]> {
    return this.service.findUsers();
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

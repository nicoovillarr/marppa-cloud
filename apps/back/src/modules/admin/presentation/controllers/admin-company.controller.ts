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
import { AdminCompanyResponse } from '@/admin/application/models/admin.response';
import { CreateAdminCompanyDto } from '../dtos/create-admin-company.dto';
import { UpdateAdminCompanyDto } from '../dtos/update-admin-company.dto';

@Controller('admin/companies')
@UseGuards(PlatformAdminGuard)
export class AdminCompanyController {
  constructor(private readonly service: AdminApiService) { }

  @Get()
  findAll(): Promise<AdminCompanyResponse[]> {
    return this.service.findCompanies();
  }

  @Post()
  create(
    @Body() data: CreateAdminCompanyDto,
  ): Promise<AdminCompanyResponse> {
    return this.service.createCompany(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateAdminCompanyDto,
  ): Promise<AdminCompanyResponse> {
    return this.service.updateCompany(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.service.deleteCompany(id);
  }
}

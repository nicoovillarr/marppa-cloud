import { Injectable } from '@nestjs/common';

import { AdminCompanyService } from '@/admin/domain/services/admin-company.service';
import { AdminUserService } from '@/admin/domain/services/admin-user.service';
import { AdminHostCapacityService } from '@/admin/domain/services/admin-host-capacity.service';
import { AdminResourceService } from '@/admin/domain/services/admin-resource.service';
import { PaginationQuery } from '@/shared/presentation/dtos/pagination.query';
import { AdminResourceQuery } from '@/admin/presentation/dtos/admin-resource.query';
import {
  PaginatedResponse,
  paginated,
} from '@/shared/presentation/dtos/paginated.response';
import { CreateAdminCompanyDto } from '@/admin/presentation/dtos/create-admin-company.dto';
import { UpdateAdminCompanyDto } from '@/admin/presentation/dtos/update-admin-company.dto';
import { CreateAdminUserDto } from '@/admin/presentation/dtos/create-admin-user.dto';
import { UpdateAdminUserDto } from '@/admin/presentation/dtos/update-admin-user.dto';
import { UpdateHostCapacityDto } from '@/admin/presentation/dtos/update-host-capacity.dto';
import {
  AdminCompanyResponse,
  AdminHostCapacityResponse,
  AdminResourceResponse,
  AdminUserResponse,
  toAdminCompanyResponse,
  toAdminHostCapacityResponse,
  toAdminResourceResponse,
  toAdminUserResponse,
} from '../models/admin.response';

@Injectable()
export class AdminApiService {
  constructor(
    private readonly companyService: AdminCompanyService,
    private readonly userService: AdminUserService,
    private readonly hostCapacityService: AdminHostCapacityService,
    private readonly resourceService: AdminResourceService,
  ) { }

  // Companies

  async findCompanies(): Promise<AdminCompanyResponse[]> {
    const companies = await this.companyService.findAll();
    return companies.map(toAdminCompanyResponse);
  }

  async createCompany(
    data: CreateAdminCompanyDto,
  ): Promise<AdminCompanyResponse> {
    const company = await this.companyService.create(data);

    return toAdminCompanyResponse(company);
  }

  async updateCompany(
    id: string,
    data: UpdateAdminCompanyDto,
  ): Promise<AdminCompanyResponse> {
    const company = await this.companyService.update(id, data);

    return toAdminCompanyResponse(company);
  }

  async deleteCompany(id: string): Promise<void> {
    await this.companyService.delete(id);
  }

  // Users

  async findUsers(
    query: PaginationQuery,
  ): Promise<PaginatedResponse<AdminUserResponse>> {
    const { items, total } = await this.userService.findPage(
      query.skip,
      query.take,
    );

    return paginated(
      items.map(toAdminUserResponse),
      total,
      query.page!,
      query.pageSize!,
    );
  }

  async createUser(data: CreateAdminUserDto): Promise<AdminUserResponse> {
    const user = await this.userService.create(data);

    return toAdminUserResponse(user);
  }

  async updateUser(
    id: string,
    data: UpdateAdminUserDto,
  ): Promise<AdminUserResponse> {
    return toAdminUserResponse(await this.userService.update(id, data));
  }

  async deleteUser(id: string): Promise<void> {
    await this.userService.delete(id);
  }

  // Host capacity

  async findHosts(): Promise<AdminHostCapacityResponse[]> {
    const hosts = await this.hostCapacityService.findAll();
    return hosts.map(toAdminHostCapacityResponse);
  }

  async updateHostOverride(
    hostname: string,
    data: UpdateHostCapacityDto,
  ): Promise<AdminHostCapacityResponse> {
    const host = await this.hostCapacityService.updateOverride(hostname, data);

    return toAdminHostCapacityResponse(host);
  }

  async deleteHost(hostname: string): Promise<void> {
    await this.hostCapacityService.delete(hostname);
  }

  // Resources

  async findResources(
    query: AdminResourceQuery,
  ): Promise<PaginatedResponse<AdminResourceResponse>> {
    const { items, total } = await this.resourceService.findPage(
      query.skip,
      query.take,
      { type: query.type, companyId: query.companyId },
    );

    return paginated(
      items.map(toAdminResourceResponse),
      total,
      query.page!,
      query.pageSize!,
    );
  }

  // Audit
}

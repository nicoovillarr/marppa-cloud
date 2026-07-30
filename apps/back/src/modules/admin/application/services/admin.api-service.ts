import { Injectable } from '@nestjs/common';

import { AdminCompanyService } from '@/admin/domain/services/admin-company.service';
import { AdminUserService } from '@/admin/domain/services/admin-user.service';
import { AdminHostCapacityService } from '@/admin/domain/services/admin-host-capacity.service';
import { AdminResourceService } from '@/admin/domain/services/admin-resource.service';
import { CreateAdminCompanyDto } from '@/admin/presentation/dtos/create-admin-company.dto';
import { UpdateAdminCompanyDto } from '@/admin/presentation/dtos/update-admin-company.dto';
import { CreateAdminUserDto } from '@/admin/presentation/dtos/create-admin-user.dto';
import { UpdateAdminUserDto } from '@/admin/presentation/dtos/update-admin-user.dto';
import { UpsertHostCapacityDto } from '@/admin/presentation/dtos/upsert-host-capacity.dto';
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
    return toAdminCompanyResponse(await this.companyService.create(data));
  }

  async updateCompany(
    id: string,
    data: UpdateAdminCompanyDto,
  ): Promise<AdminCompanyResponse> {
    return toAdminCompanyResponse(await this.companyService.update(id, data));
  }

  async deleteCompany(id: string): Promise<void> {
    await this.companyService.delete(id);
  }

  // Users

  async findUsers(): Promise<AdminUserResponse[]> {
    const users = await this.userService.findAll();
    return users.map(toAdminUserResponse);
  }

  async createUser(data: CreateAdminUserDto): Promise<AdminUserResponse> {
    return toAdminUserResponse(await this.userService.create(data));
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

  async upsertHost(
    hostname: string,
    data: UpsertHostCapacityDto,
  ): Promise<AdminHostCapacityResponse> {
    return toAdminHostCapacityResponse(
      await this.hostCapacityService.upsert(hostname, data),
    );
  }

  async deleteHost(hostname: string): Promise<void> {
    await this.hostCapacityService.delete(hostname);
  }

  // Resources

  async findResources(): Promise<AdminResourceResponse[]> {
    const resources = await this.resourceService.findAll();
    return resources.map(toAdminResourceResponse);
  }
}

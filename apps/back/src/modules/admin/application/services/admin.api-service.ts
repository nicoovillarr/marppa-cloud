import { Injectable } from '@nestjs/common';

import { AdminCompanyService } from '@/admin/domain/services/admin-company.service';
import { AdminUserService } from '@/admin/domain/services/admin-user.service';
import { AdminHostCapacityService } from '@/admin/domain/services/admin-host-capacity.service';
import { AdminResourceService } from '@/admin/domain/services/admin-resource.service';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { PaginationQuery } from '@/shared/presentation/dtos/pagination.query';
import { AdminResourceQuery } from '@/admin/presentation/dtos/admin-resource.query';
import {
  PaginatedResponse,
  paginated,
} from '@/shared/presentation/dtos/paginated.response';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
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
    private readonly eventDispatch: EventDispatchService,
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
    await this.audit(EventTypeKey.ADMIN_COMPANY_CREATED, 'Company', company.id, {
      name: company.name,
    });

    return toAdminCompanyResponse(company);
  }

  async updateCompany(
    id: string,
    data: UpdateAdminCompanyDto,
  ): Promise<AdminCompanyResponse> {
    const company = await this.companyService.update(id, data);
    await this.audit(EventTypeKey.ADMIN_COMPANY_UPDATED, 'Company', id, {
      name: company.name,
    });

    return toAdminCompanyResponse(company);
  }

  async deleteCompany(id: string): Promise<void> {
    await this.companyService.delete(id);
    await this.audit(EventTypeKey.ADMIN_COMPANY_DELETED, 'Company', id);
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
    await this.audit(EventTypeKey.ADMIN_USER_CREATED, 'User', user.id, {
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    return toAdminUserResponse(user);
  }

  async updateUser(
    id: string,
    data: UpdateAdminUserDto,
  ): Promise<AdminUserResponse> {
    const { user, sessionsRevoked } = await this.userService.update(id, data);

    await this.audit(EventTypeKey.ADMIN_USER_UPDATED, 'User', id, {
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      changed: Object.keys(data)
        .filter((field) => field !== 'password')
        .join(',') || 'none',
      passwordReset: String(data.password != null),
    });

    if (sessionsRevoked) {
      await this.audit(EventTypeKey.ADMIN_USER_SESSIONS_REVOKED, 'User', id);
    }

    return toAdminUserResponse(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userService.delete(id);
    await this.audit(EventTypeKey.ADMIN_USER_DELETED, 'User', id);
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
    const host = await this.hostCapacityService.upsert(hostname, data);
    await this.audit(
      EventTypeKey.ADMIN_HOST_CAPACITY_UPDATED,
      'HostCapacity',
      hostname,
      {
        cpuCores: String(host.cpuCores),
        ramMB: String(host.ramMB),
        diskGB: String(host.diskGB),
      },
    );

    return toAdminHostCapacityResponse(host);
  }

  async deleteHost(hostname: string): Promise<void> {
    await this.hostCapacityService.delete(hostname);
    await this.audit(
      EventTypeKey.ADMIN_HOST_CAPACITY_DELETED,
      'HostCapacity',
      hostname,
    );
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

  private audit(
    type: EventTypeKey,
    resourceType: string,
    id: string,
    properties?: Record<string, string>,
  ): Promise<number> {
    return this.eventDispatch.record({
      type,
      primary: { type: resourceType, id },
      properties,
    });
  }
}

import { UserRole } from '@marppa-cloud/db';

import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import {
  AdminCompanyCounts,
  AdminCompanyModel,
} from '@/admin/domain/models/admin-company.model';
import { AdminUserModel } from '@/admin/domain/models/admin-user.model';
import {
  AdminResourceModel,
  AdminResourceType,
} from '@/admin/domain/models/admin-resource.model';

export interface AdminCompanyResponse {
  id: string;
  name: string;
  alias: string | null;
  description: string | null;
  parentCompanyId: string | null;
  isRoot: boolean;
  counts: AdminCompanyCounts;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminHostCapacityResponse {
  hostname: string;
  cpuCores: number;
  ramMB: number;
  diskGB: number;
  cpuCoresOverride: number | null;
  ramMBOverride: number | null;
  diskGBOverride: number | null;
  effectiveCpuCores: number;
  effectiveRamMB: number;
  effectiveDiskGB: number;
  reportedAt: Date;
}

export interface AdminResourceResponse {
  id: string;
  type: AdminResourceType;
  name: string;
  status: ResourceStatus;
  companyId: string;
  companyName: string;
  createdAt: Date;
}

export function toAdminCompanyResponse(
  company: AdminCompanyModel,
): AdminCompanyResponse {
  return {
    id: company.id,
    name: company.name,
    alias: company.alias,
    description: company.description,
    parentCompanyId: company.parentCompanyId,
    isRoot: company.isRoot,
    counts: company.counts,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export function toAdminUserResponse(user: AdminUserModel): AdminUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toAdminHostCapacityResponse(
  host: HostCapacityModel,
): AdminHostCapacityResponse {
  return {
    hostname: host.hostname,
    cpuCores: host.cpuCores,
    ramMB: host.ramMB,
    diskGB: host.diskGB,
    cpuCoresOverride: host.cpuCoresOverride,
    ramMBOverride: host.ramMBOverride,
    diskGBOverride: host.diskGBOverride,
    effectiveCpuCores: host.effectiveCpuCores,
    effectiveRamMB: host.effectiveRamMB,
    effectiveDiskGB: host.effectiveDiskGB,
    reportedAt: host.reportedAt,
  };
}

export function toAdminResourceResponse(
  resource: AdminResourceModel,
): AdminResourceResponse {
  return {
    id: resource.id,
    type: resource.type,
    name: resource.name,
    status: resource.status,
    companyId: resource.companyId,
    companyName: resource.companyName,
    createdAt: resource.createdAt,
  };
}

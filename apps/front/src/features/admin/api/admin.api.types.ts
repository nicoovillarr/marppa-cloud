import { ResourceStatus } from "@/core/models/resource-status.enum";
import { UserRole } from "@/users/model/user.types";

export type Paginated<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export type PageQuery = {
    page?: number;
    pageSize?: number;
}

export type AdminResourceQuery = PageQuery & {
    type?: AdminResourceType;
    companyId?: string;
}

export type AdminCompanyCounts = {
    users: number;
    workers: number;
    atoms: number;
    zones: number;
    portals: number;
}

export type AdminCompanyResponseDto = {
    id: string;
    name: string;
    alias: string | null;
    description: string | null;
    parentCompanyId: string | null;
    isRoot: boolean;
    counts: AdminCompanyCounts;
    createdAt: string;
    updatedAt: string;
}

export type CreateAdminCompanyDto = {
    name: string;
    alias?: string;
    description?: string;
    parentCompanyId?: string;
}

export type AdminUserResponseDto = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string;
    companyName: string;
    createdAt: string;
    updatedAt: string;
}

export type CreateAdminUserDto = {
    email: string;
    password: string;
    name: string;
    companyId: string;
    role?: UserRole;
}

export type UpdateAdminUserDto = {
    name?: string;
    email?: string;
    companyId?: string;
    role?: UserRole;
    password?: string;
}

export type AdminHostCapacityResponseDto = {
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
    reportedAt: string;
}

export type UpdateHostCapacityDto = {
    cpuCoresOverride?: number | null;
    ramMBOverride?: number | null;
    diskGBOverride?: number | null;
}

export type AdminResourceType = "Worker" | "Atom" | "Zone" | "Portal";

export type AdminResourceResponseDto = {
    id: string;
    type: AdminResourceType;
    name: string;
    status: ResourceStatus;
    companyId: string;
    companyName: string;
    createdAt: string;
}

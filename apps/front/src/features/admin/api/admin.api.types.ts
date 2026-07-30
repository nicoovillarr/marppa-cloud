import { ResourceStatus } from "@/core/models/resource-status.enum";
import { UserRole } from "@/users/model/user.types";

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
    reportedAt: string;
}

export type UpsertHostCapacityDto = {
    cpuCores: number;
    ramMB: number;
    diskGB: number;
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

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

export type StorageMedia = "NVME" | "SSD" | "HDD";

export type AdminHostCapacityResponseDto = {
    hostname: string;
    cpuCores: number;
    ramMB: number;
    workerDiskGB: number;
    atomVolumeGB: number;
    workerDiskMedia: StorageMedia | null;
    atomVolumeMedia: StorageMedia | null;
    cpuCoresOverride: number | null;
    ramMBOverride: number | null;
    workerDiskGBOverride: number | null;
    atomVolumeGBOverride: number | null;
    effectiveCpuCores: number;
    effectiveRamMB: number;
    effectiveWorkerDiskGB: number;
    effectiveAtomVolumeGB: number;
    reportedAt: string;
}

export type UpdateHostCapacityDto = {
    cpuCoresOverride?: number | null;
    ramMBOverride?: number | null;
    workerDiskGBOverride?: number | null;
    atomVolumeGBOverride?: number | null;
}

export type HostBudgetSource = "REPORTED" | "CONFIGURED";

export type ComputeUsageDto = {
    running: number;
    provisioned: number;
    budget: number;
    reported: number;
}

export type VcpuUsageDto = ComputeUsageDto & {
    overcommit: number;
}

export type StoragePoolUsageDto = {
    provisioned: number;
    budget: number;
    reported: number;
    media: StorageMedia[];
}

export type AdminHostUsageResponseDto = {
    source: HostBudgetSource;
    vcpu: VcpuUsageDto;
    ramMB: ComputeUsageDto;
    workerDiskGB: StoragePoolUsageDto;
    atomVolumeGB: StoragePoolUsageDto;
}

export type FilesystemMetricsDto = {
    mountPoint: string;
    device: string;
    fsType: string;
    sizeBytes: number;
    usedBytes: number;
    media: StorageMedia | null;
}

export type HeadroomCheckDto = {
    reserved: number;
    external: number;
    exceeded: boolean;
}

export type AdminHostMetricsResponseDto = {
    hostname: string;
    sampledAt: string;
    stale: boolean;
    cpu: {
        cores: number;
        usedPercent: number;
        platformPercent: number | null;
        externalPercent: number | null;
        loadAverage1m: number;
    };
    memory: {
        totalMB: number;
        usedMB: number;
        platformMB: number | null;
        externalMB: number | null;
    };
    atomVolumePool: { sizeGB: number; allocatedGB: number } | null;
    filesystems: FilesystemMetricsDto[];
    headroom: {
        cpuCores: HeadroomCheckDto | null;
        memoryMB: HeadroomCheckDto | null;
    };
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

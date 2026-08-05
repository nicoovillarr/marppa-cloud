import { ResourceStatus } from "@/core/models/resource-status.enum";

export type WorkerDiskResponseDto = {
    id: number;
    name: string;
    status: ResourceStatus;
    sizeGiB: number;
    hostPath: string | null;
    ownerId: string;
    storageTypeId: number;
    mountPoint: string | null;
    deviceTarget: string | null;
    isBoot: boolean;
    workerId: string | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date | null;
    updatedBy: string | null;
}

export type CreateWorkerDiskDto = {
    name: string;
    sizeGiB: number;
    storageTypeId: number;
    mountPoint: string;
    ownerId?: string;
}

export type UpdateWorkerDiskDto = {
    name: string;
}

import { ResourceStatus } from "@/core/models/resource-status.enum";

export type AtomVolumeResponseDto = {
    id: number;
    name: string;
    status: ResourceStatus;
    sizeGiB: number;
    hostPath: string | null;
    mountPoint: string | null;
    ownerId: string;
    atomId: string | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date | null;
    updatedBy: string | null;
}

export type CreateAtomVolumeDto = {
    name: string;
    sizeGiB: number;
    ownerId?: string;
}

export type UpdateAtomVolumeDto = {
    name: string;
}

export type ResizeAtomVolumeDto = {
    sizeGiB: number;
}

export type AttachAtomVolumeDto = {
    atomId: string;
    mountPoint: string;
}

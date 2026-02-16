import { ResourceStatus } from "@/core/models/resource-status.enum";

export type CreateNodeDto = {
    workerId?: string;
    atomId?: string;
}

export type NodeResponseDto = {
    id: string;
    ipAddress: string;
    status: ResourceStatus;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date | null;
    updatedBy: string | null;
    zoneId: string;
    workerId: string | null;
    atomId: string | null;
}
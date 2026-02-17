import { ResourceStatus } from "@/core/models/resource-status.enum";

export type FiberResponseDto = {
    id: string;
    protocol: string;
    hostPort: number;
    targetPort: number;
    status: ResourceStatus;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date | null;
    updatedBy: string | null;
    nodeId: string;
}
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { FiberResponseDto } from "./fiber.api.types";

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

export type NodeWithFibers = NodeResponseDto & {
    fibers: FiberResponseDto[];
}
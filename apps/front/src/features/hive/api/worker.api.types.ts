import { NodeResponseDto } from "src/features/mesh/api/node.api.types";
import { WorkerFlavorResponseDto } from "./worker-flavor.api.types";
import { ResourceStatus } from "@/core/models/resource-status.enum";

export type CreateWorkerDto = {
    name: string;
    imageId: number;
    flavorId: number;
    ownerId?: string;
    publicSSH?: string;
}

export type WorkerResponseDto = {
    id: string;
    name: string;
    status: ResourceStatus;
    macAddress: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date | null;
    updatedBy: string | null;
    ownerId: string;
    imageId: number;
    flavorId: number;
}

export type WorkerWithRelationsResponseDto = WorkerResponseDto & {
    flavor: WorkerFlavorResponseDto;
    node: NodeResponseDto | null;
}
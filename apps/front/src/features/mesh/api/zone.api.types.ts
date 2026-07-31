import { NodeResponseDto, NodeWithFibers } from "./node.api.types";
import { ResourceStatus } from "@/core/models/resource-status.enum";

export type CreateZoneDto = {
    name: string;
    description: string;
    cidr?: string;
}

export type ZoneResponseDto = {
    id: string;
    name: string;
    description: string;
    status: ResourceStatus;
    cidr: string;
    gateway: string;
    usedIPs: number;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

export type ZoneWithNodes = ZoneResponseDto & {
    nodes: NodeResponseDto[];
}

export type ZoneWithNodesAndFibers = ZoneResponseDto & {
    nodes: NodeWithFibers[];
}

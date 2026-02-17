import { NodeResponseDto, NodeWithFibers } from "./node.api.types";

export type CreateZoneDto = {
    name: string;
    description: string;
}

export type ZoneResponseDto = {
    id: string;
    name: string;
    description: string;
    status: string;
    cidr: string;
    gateway: string;
    usedIPs: number;
    createdAt: string;
    updatedAt: string;
}

export type ZoneWithNodes = ZoneResponseDto & {
    nodes: NodeResponseDto[];
}

export type ZoneWithNodesAndFibers = ZoneResponseDto & {
    nodes: NodeWithFibers[];
}

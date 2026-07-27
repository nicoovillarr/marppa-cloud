import { ResourceStatus } from "@/core/models/resource-status.enum";
import { PortalType } from "../models/portal-type.enum";
import { TransponderResponseModel, TransponderWithNodeResponseModel } from "./transponder.api.type";

export type CreatePortalDto = {
    name: string;
    description?: string;
    address: string;
    type: PortalType;
    apiKey: string;
    enableCompression?: boolean;
    corsEnabled?: boolean;
    zoneId?: string;
}

export type UpdatePortalDto = Partial<CreatePortalDto>;

export type PortalResponseDto = {
    id: string;
    name: string;
    description: string;
    address: string;
    type: PortalType;
    lastSyncAt: Date;
    lastPublicIP: string;
    status: ResourceStatus;
    enableCompression: boolean;
    corsEnabled: boolean;
    createdBy: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
    zoneId: string;
}

export type PortalWithTranspondersResponseDto = PortalResponseDto & {
    transponders: TransponderResponseModel[];
}

export type PortalWithTranspondersWithNodesResponseDto = PortalResponseDto & {
    transponders: TransponderWithNodeResponseModel[];
}
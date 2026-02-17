import { ResourceStatus } from "@/core/models/resource-status.enum";
import { PortalType } from "../models/portal-type.enum";
import { TransponderResponseModel } from "./transponder.api.type";

export type CreatePortalDto = {
    name: string;
    description?: string;
    address: string;
    type: PortalType;
    apiKey: string;
    listenHttp?: boolean;
    listenHttps?: boolean;
    sslCertificate?: string;
    sslKey?: string;
    enableCompression?: boolean;
    cacheEnabled?: boolean;
    corsEnabled?: boolean;
    defaultServer?: boolean;
    zoneId?: string;
}

export type PortalResponseDto = {
    id: string;
    name: string;
    description: string;
    address: string;
    type: PortalType;
    apiKey: string;
    lastSyncAt: Date;
    lastPublicIP: string;
    status: ResourceStatus;
    listenHttp: boolean;
    listenHttps: boolean;
    sslCertificate: string;
    sslKey: string;
    enableCompression: boolean;
    cacheEnabled: boolean;
    corsEnabled: boolean;
    defaultServer: boolean;
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
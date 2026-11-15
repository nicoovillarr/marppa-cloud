import { PortalType } from "../models/portal-type.enum";

export type CreateDnsApiKeyDto = {
    name: string;
    type: PortalType;
    apiKey: string;
}

export type UpdateDnsApiKeyDto = {
    name?: string;
    apiKey?: string;
}

export type DnsApiKeyResponseDto = {
    id: number;
    name: string;
    type: PortalType;
    portalCount: number;
    ownerId: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
}

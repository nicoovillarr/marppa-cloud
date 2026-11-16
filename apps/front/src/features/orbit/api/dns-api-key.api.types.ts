import { PortalType } from "../models/portal-type.enum";

export type CreateDnsApiKeyDto = {
    name: string;
    description?: string;
    type: PortalType;
    apiKey: string;
}

export type UpdateDnsApiKeyDto = {
    name?: string;
    description?: string | null;
    apiKey?: string;
}

export type DnsApiKeyResponseDto = {
    id: number;
    name: string;
    description: string | null;
    type: PortalType;
    portalCount: number;
    ownerId: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
}

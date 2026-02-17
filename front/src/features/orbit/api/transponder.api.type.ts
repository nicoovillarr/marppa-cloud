import { ResourceStatus } from "@/core/models/resource-status.enum";
import { TransponderMode } from "../models/transponder-mode.enum";

export type CreateTransponderDto = {
    path: string;
    port: number;
    mode?: TransponderMode;
    cacheEnabled?: boolean;
    allowCookies?: boolean;
    gzipEnabled?: boolean;
    priority?: number;
    nodeId: string;
}

export type TransponderResponseModel = {
    id: string;
    path: string;
    port: number;
    status: ResourceStatus;
    mode: TransponderMode;
    cacheEnabled: boolean;
    allowCookies: boolean;
    gzipEnabled: boolean;
    priority: number;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    portalId: string;
    nodeId: string;
}

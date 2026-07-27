import { PortalType, ResourceStatus, TransponderMode } from './enums';
import { NodeResponse } from './mesh';

export const SUPPORTED_PORTAL_TYPES: PortalType[] = [PortalType.CLOUDFLARE];

// --- Requests ---

export interface CreatePortalRequest {
  name: string;
  description?: string;
  address: string;
  type: PortalType;
  apiKey: string;
  enableCompression?: boolean;
  corsEnabled?: boolean;
  zoneId?: string;
}

export type UpdatePortalRequest = Partial<CreatePortalRequest>;

export interface CreateTransponderRequest {
  path: string;
  port: number;
  mode?: TransponderMode;
  cacheEnabled?: boolean;
  allowCookies?: boolean;
  gzipEnabled?: boolean;
  priority?: number;
  nodeId?: string;
}

export type UpdateTransponderRequest = Partial<CreateTransponderRequest>;

// --- Responses ---

export interface PortalResponse {
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
  ownerId: string;
  zoneId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface TransponderResponse {
  id: string;
  path: string;
  port: number;
  status: ResourceStatus;
  mode: TransponderMode;
  cacheEnabled: boolean;
  allowCookies: boolean;
  gzipEnabled: boolean;
  priority: number;
  portalId: string;
  nodeId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface TransponderWithNodeResponse extends TransponderResponse {
  node: NodeResponse;
}

export interface PortalWithTranspondersResponse extends PortalResponse {
  transponders: TransponderWithNodeResponse[];
}

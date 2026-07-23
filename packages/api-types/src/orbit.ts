import { PortalType, ResourceStatus, TransponderMode } from './enums';
import { NodeResponse } from './mesh';

// --- Requests ---

export interface CreatePortalRequest {
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

export type UpdatePortalRequest = CreatePortalRequest;

export interface CreateTransponderRequest {
  portalId: string;
  path: string;
  port: number;
  mode?: TransponderMode;
  cacheEnabled?: boolean;
  allowCookies?: boolean;
  gzipEnabled?: boolean;
  priority?: number;
  nodeId?: string;
}

export type UpdateTransponderRequest = CreateTransponderRequest;

// --- Responses ---

export interface PortalResponse {
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

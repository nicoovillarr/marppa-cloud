import { ResourceStatus } from './enums';

// --- Requests ---

export interface CreateZoneRequest {
  name: string;
  description?: string;
}

export type UpdateZoneRequest = CreateZoneRequest;

export interface CreateNodeRequest {
  workerId: string;
  atomId: string;
}

export interface CreateFiberRequest {
  protocol: string;
  targetPort: number;
}

// --- Responses ---

export interface ZoneResponse {
  id: string;
  name: string;
  description: string;
  status: ResourceStatus;
  cidr: string;
  gateway: string;
  ownerId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface NodeResponse {
  id: string;
  ipAddress: string;
  status: ResourceStatus;
  zoneId: string;
  workerId: string | null;
  atomId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface FiberResponse {
  id: string;
  protocol: string;
  hostPort: number;
  targetPort: number;
  status: ResourceStatus;
  nodeId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface NodeWithFibersResponse extends NodeResponse {
  fibers: FiberResponse[];
}

export interface ZoneWithNodesResponse extends ZoneResponse {
  nodes: NodeResponse[];
}

export interface ZoneWithNodesAndFibersResponse extends ZoneResponse {
  nodes: NodeWithFibersResponse[];
}

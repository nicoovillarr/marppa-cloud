import { NodeResponse } from './mesh';

// --- Requests ---

export interface CreateWorkerRequest {
  name: string;
  imageId: number;
  flavorId: number;
  ownerId?: string;
  publicSSH: string;
}

export interface UpdateWorkerRequest {
  name: string;
}

export interface CreateWorkerDiskRequest {
  name: string;
  sizeGiB: number;
  hostPath: string;
  ownerId: string;
  storageTypeId: number;
  mountPoint?: string;
  isBoot: boolean;
  workerId?: string | null;
}

export type UpdateWorkerDiskRequest = CreateWorkerDiskRequest;

export interface CreateWorkerFamilyRequest {
  name: string;
  description?: string;
}

export type UpdateWorkerFamilyRequest = CreateWorkerFamilyRequest;

export interface CreateWorkerFlavorRequest {
  name: string;
  cpuCores: number;
  ramMB: number;
  diskGB: number;
  familyId: number;
}

export type UpdateWorkerFlavorRequest = CreateWorkerFlavorRequest;

export interface CreateWorkerImageRequest {
  name: string;
  osType: string;
  osFamily: string;
  imageUrl: string;
  architecture: string;
  virtualizationType: string;
  description?: string;
  osVersion?: string;
  workerStorageTypeId?: number;
}

export type UpdateWorkerImageRequest = CreateWorkerImageRequest;

export interface CreateWorkerStorageTypeRequest {
  name: string;
  description?: string;
  persistent: boolean;
  attachable: boolean;
  shared: boolean;
}

export type UpdateWorkerStorageTypeRequest = CreateWorkerStorageTypeRequest;

// --- Responses ---

export interface WorkerResponse {
  id: string;
  name: string;
  status: string;
  macAddress: string;
  ownerId: string;
  imageId: number;
  flavorId: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface WorkerFlavorResponse {
  id: number;
  name: string;
  cpuCores: number;
  ramMB: number;
  diskGB: number;
  familyId: number;
}

export interface WorkerWithRelationsResponse extends WorkerResponse {
  flavor: WorkerFlavorResponse;
  node: NodeResponse | null;
}

export interface WorkerDiskResponse {
  id: string;
  name: string;
  sizeGiB: number;
  hostPath: string;
  ownerId: string;
  storageTypeId: string;
  mountPoint: string | null;
  isBoot: boolean;
  workerId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface WorkerFamilyResponse {
  id: string;
  name: string;
  description: string | null;
}

export interface WorkerFamilyWithFlavorsResponse extends WorkerFamilyResponse {
  flavors: WorkerFlavorResponse[];
}

export interface WorkerImageResponse {
  id: number;
  name: string;
  description: string | null;
  osType: string;
  osVersion: string | null;
  osFamily: string;
  imageUrl: string;
  architecture: string;
  virtualizationType: string;
  workerStorageTypeId: string | null;
}

export interface WorkerStorageTypeResponse {
  id: string;
  name: string;
  description: string | null;
  persistent: boolean;
  attachable: boolean;
  shared: boolean;
}

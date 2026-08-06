import { ResourceStatus } from './enums';
import { NodeResponse } from './mesh';

// --- Catalog constraints ---

export const WORKER_ARCHITECTURES = ['amd64', 'arm64'] as const;

export type WorkerArchitecture = (typeof WORKER_ARCHITECTURES)[number];

export const MIN_WORKER_CPU_CORES = 0.25;
export const MIN_WORKER_RAM_MB = 256;
export const MIN_WORKER_DISK_GB = 10;

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

export const MIN_WORKER_VOLUME_GB = 1;
export const MAX_WORKER_VOLUME_GB = 2048;

export const WORKER_VOLUME_MOUNT_POINT = /^\/[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)*$/;

export const WORKER_VOLUME_DEVICE_TARGETS = Array.from(
  { length: 25 },
  (_, i) => `vd${String.fromCharCode('b'.charCodeAt(0) + i)}`,
);

const RESERVED_MOUNT_ROOTS = [
  'bin', 'boot', 'dev', 'etc', 'lib', 'lib32', 'lib64', 'proc',
  'root', 'run', 'sbin', 'sys', 'usr', 'var',
];

export function isReservedMountPoint(mountPoint: string): boolean {
  const root = mountPoint.split('/')[1];
  return RESERVED_MOUNT_ROOTS.includes(root);
}

export interface CreateWorkerDiskRequest {
  name: string;
  sizeGiB: number;
  ownerId?: string;
  storageTypeId: number;
  mountPoint: string;
}

export interface UpdateWorkerDiskRequest {
  name: string;
}

export interface AttachWorkerDiskRequest {
  workerId: string;
}

export interface CreateWorkerFamilyRequest {
  name: string;
  architecture: string;
  description?: string;
  ownerId?: string;
}

export interface UpdateWorkerFamilyRequest {
  description?: string;
}

export interface CreateWorkerFlavorRequest {
  name: string;
  cpuCores: number;
  ramMB: number;
  pricePerHourCents?: number;
  familyId: number;
}

export interface UpdateWorkerFlavorRequest {
  cpuCores: number;
  ramMB: number;
  pricePerHourCents?: number;
}

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
  cpuCores: number;
  ramMB: number;
  diskGB: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface WorkerFlavorResponse {
  id: number;
  name: string;
  version: number;
  cpuCores: number;
  ramMB: number;
  pricePerHourCents: number;
  deprecatedAt: Date | null;
  familyId: number;
}

export interface WorkerWithRelationsResponse extends WorkerResponse {
  flavor: WorkerFlavorResponse;
  node: NodeResponse | null;
}

export interface WorkerDiskResponse {
  id: string;
  name: string;
  status: ResourceStatus;
  sizeGiB: number;
  hostPath: string | null;
  ownerId: string;
  storageTypeId: string;
  mountPoint: string | null;
  deviceTarget: string | null;
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
  architecture: string;
  ownerId: string | null;
  deprecatedAt: Date | null;
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

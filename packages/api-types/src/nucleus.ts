import { NodeResponse } from './mesh';

// --- Catalog constraints ---

export const MIN_ATOM_CPU_CORES = 0.1;
export const MIN_ATOM_RAM_MB = 64;

export const MIN_ATOM_VOLUME_GB = 1;
export const MAX_ATOM_VOLUME_GB = 2048;

export const ATOM_VOLUME_MOUNT_POINT = /^\/[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)*$/;

const FORBIDDEN_MOUNT_POINT_ROOTS = ['dev', 'proc', 'sys'];

export function isForbiddenAtomMountPoint(mountPoint: string): boolean {
  if (!ATOM_VOLUME_MOUNT_POINT.test(mountPoint)) return true;

  const segments = mountPoint.split('/').slice(1);

  if (segments.some((segment) => segment === '.' || segment === '..')) return true;

  return FORBIDDEN_MOUNT_POINT_ROOTS.includes(segments[0]);
}

// --- Requests ---

export interface CreateAtomRequest {
  name: string;
  imageId: number;
  tag?: string;
  sizeId?: number;
  ownerId?: string;
  volumeId?: number;
  envVars?: CreateAtomEnvVarRequest[];
}

export interface UpdateAtomRequest {
  name: string;
}

export interface CreateAtomEnvVarRequest {
  key: string;
  value: string;
}

export interface CreateAtomVolumeRequest {
  name: string;
  sizeGiB: number;
  ownerId?: string;
}

export interface UpdateAtomVolumeRequest {
  name: string;
}

export interface ResizeAtomVolumeRequest {
  sizeGiB: number;
}

export interface AttachAtomVolumeRequest {
  atomId: string;
  mountPoint: string;
}

// --- Responses ---

export interface AtomResponse {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  imageId: number;
  tag: string;
  sizeId: number;
  cpuCores: number;
  ramMB: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface AtomImageResponse {
  id: number;
  name: string;
  description: string | null;
  registry: string;
  repository: string;
  defaultTag: string;
  digest: string | null;
  architecture: string;
  capabilities: string[];
  dataPaths: string[];
  certMountPoint: string | null;
  defaultSizeId: number;
}

export interface AtomVolumeResponse {
  id: number;
  name: string;
  status: string;
  sizeGiB: number;
  hostPath: string | null;
  mountPoint: string | null;
  ownerId: string;
  atomId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface AtomSizeResponse {
  id: number;
  name: string;
  version: number;
  cpuCores: number;
  ramMB: number;
  pricePerHourCents: number;
  deprecatedAt: Date | null;
}

export interface CreateAtomSizeRequest {
  name: string;
  cpuCores: number;
  ramMB: number;
  pricePerHourCents?: number;
}

export interface UpdateAtomSizeRequest {
  cpuCores: number;
  ramMB: number;
  pricePerHourCents?: number;
}

export interface AtomEnvVarResponse {
  id: number;
  key: string;
  value: string;
  atomId: string;
}

export interface AtomWithRelationsResponse extends AtomResponse {
  image: AtomImageResponse;
  node: NodeResponse | null;
}

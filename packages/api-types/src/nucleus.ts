import { NodeResponse } from './mesh';

// --- Catalog constraints ---

export const MIN_ATOM_CPU_CORES = 0.1;
export const MIN_ATOM_RAM_MB = 64;

// --- Requests ---

export interface CreateAtomRequest {
  name: string;
  imageId: number;
  sizeId?: number;
  ownerId?: string;
  envVars?: CreateAtomEnvVarRequest[];
}

export interface UpdateAtomRequest {
  name: string;
}

export interface CreateAtomEnvVarRequest {
  key: string;
  value: string;
}

// --- Responses ---

export interface AtomResponse {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  imageId: number;
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
  tag: string;
  digest: string | null;
  architecture: string;
  capabilities: string[];
  defaultSizeId: number;
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

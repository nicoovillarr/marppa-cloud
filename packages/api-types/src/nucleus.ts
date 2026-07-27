import { NodeResponse } from './mesh';

// --- Requests ---

export interface CreateAtomRequest {
  name: string;
  imageId: number;
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

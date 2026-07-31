export type AtomImageResponseDto = {
    id: number;
    name: string;
    description: string | null;
    registry: string;
    repository: string;
    defaultTag: string;
    digest: string | null;
    architecture: string;
    capabilities: string[];
    sysctls: Record<string, string> | null;
    command: string[];
    requiredEnvVars: string[];
    defaultSizeId: number;
    ownerId: string | null;
}

export type CreateAtomImageDto = {
    name: string;
    repository: string;
    defaultTag: string;
    defaultSizeId: number;
    registry?: string;
    architecture?: string;
    description?: string;
    digest?: string;
    capabilities?: string[];
    sysctls?: Record<string, string>;
    command?: string[];
    requiredEnvVars?: string[];
    ownerId?: string;
}

export type AtomImageResponseDto = {
    id: number;
    name: string;
    description: string | null;
    registry: string;
    repository: string;
    tag: string;
    digest: string | null;
    architecture: string;
    capabilities: string[];
    sysctls: Record<string, string> | null;
    command: string[];
    requiredEnvVars: string[];
    defaultSizeId: number;
}

export type CreateAtomImageDto = {
    name: string;
    repository: string;
    tag: string;
    defaultSizeId: number;
    registry?: string;
    architecture?: string;
    description?: string;
    digest?: string;
    capabilities?: string[];
    sysctls?: Record<string, string>;
    command?: string[];
    requiredEnvVars?: string[];
}

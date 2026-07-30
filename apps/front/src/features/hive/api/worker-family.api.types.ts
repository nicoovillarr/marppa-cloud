import { WorkerFlavorResponseDto } from "./worker-flavor.api.types";

export type WorkerFamilyResponseDto = {
    id: number;
    name: string;
    description: string | null;
    architecture: string;
    ownerId: string | null;
    deprecatedAt: Date | null;
}

export type WorkerFamilyWithRelationsResponseDto = WorkerFamilyResponseDto & {
    flavors: WorkerFlavorResponseDto[];
}

export type CreateWorkerFamilyDto = {
    name: string;
    architecture: string;
    description?: string;
}

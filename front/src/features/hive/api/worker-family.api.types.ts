import { WorkerFlavorResponseDto } from "./worker-flavor.api.types";

export type WorkerFamilyResponseDto = {
    id: number;
    name: string;
    description: string | null;
}

export type WorkerFamilyWithRelationsResponseDto = WorkerFamilyResponseDto & {
    flavors: WorkerFlavorResponseDto[];
}
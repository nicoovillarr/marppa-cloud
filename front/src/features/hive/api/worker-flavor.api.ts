import { fetcher } from "@/core/api/fetcher";
import { WorkerFlavorResponseDto } from "./worker-flavor.api.types";

const baseUrl = '/hive/flavors';

export const workerFlavorApi = {
    findAll(): Promise<WorkerFlavorResponseDto[]> {
        return fetcher<WorkerFlavorResponseDto[]>(baseUrl);
    }
}
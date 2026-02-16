import { fetcher } from "@/libs/fetcher";
import { WorkerFlavorResponseDto } from "./worker-flavor.api.types";

const baseUrl = '/hive/flavor';

export const workerFlavorApi = {
    findAll(): Promise<WorkerFlavorResponseDto[]> {
        return fetcher<WorkerFlavorResponseDto[]>(baseUrl);
    }
}
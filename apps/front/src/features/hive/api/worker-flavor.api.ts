import { fetcher } from "@/core/api/fetcher";
import { CreateWorkerFlavorDto, UpdateWorkerFlavorDto, WorkerFlavorResponseDto } from "./worker-flavor.api.types";

const baseUrl = '/hive/flavors';

export const workerFlavorApi = {
    findAll(): Promise<WorkerFlavorResponseDto[]> {
        return fetcher<WorkerFlavorResponseDto[]>(baseUrl);
    },

    create(data: CreateWorkerFlavorDto): Promise<WorkerFlavorResponseDto> {
        return fetcher<WorkerFlavorResponseDto>(baseUrl, 'POST', data);
    },

    revise(id: number, data: UpdateWorkerFlavorDto): Promise<WorkerFlavorResponseDto> {
        return fetcher<WorkerFlavorResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    deprecate(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },
}

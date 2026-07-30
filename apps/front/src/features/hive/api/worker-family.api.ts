import { fetcher } from "@/core/api/fetcher";
import { CreateWorkerFamilyDto, WorkerFamilyResponseDto, WorkerFamilyWithRelationsResponseDto } from "./worker-family.api.types";

const baseUrl = '/hive/families';

export const workerFamilyApi = {
    findAll(includeDeprecated = false): Promise<WorkerFamilyWithRelationsResponseDto[]> {
        return fetcher<WorkerFamilyWithRelationsResponseDto[]>(baseUrl, 'GET', { includeDeprecated });
    },

    create(data: CreateWorkerFamilyDto): Promise<WorkerFamilyResponseDto> {
        return fetcher<WorkerFamilyResponseDto>(baseUrl, 'POST', data);
    },

    update(id: number, data: CreateWorkerFamilyDto): Promise<WorkerFamilyResponseDto> {
        return fetcher<WorkerFamilyResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    deprecate(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },

    restore(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}/restore`, 'POST');
    },
}

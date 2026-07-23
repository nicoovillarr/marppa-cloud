import { fetcher } from "@/core/api/fetcher";
import { CreateWorkerDto, WorkerResponseDto, WorkerWithRelationsResponseDto } from "./worker.api.types";

const baseUrl = '/hive/workers';

const workersApi = {
    listWorkers: (): Promise<WorkerWithRelationsResponseDto[]> => {
        return fetcher<WorkerWithRelationsResponseDto[]>(baseUrl, 'GET');
    },

    getWorker: (id: string): Promise<WorkerWithRelationsResponseDto> => {
        return fetcher<WorkerWithRelationsResponseDto>(`${baseUrl}/${id}`, 'GET');
    },

    createWorker: (dto: CreateWorkerDto): Promise<WorkerWithRelationsResponseDto> => {
        return fetcher<WorkerWithRelationsResponseDto>(baseUrl, 'POST', dto);
    },

    updateWorker: (id: string, data: Partial<CreateWorkerDto>): Promise<WorkerWithRelationsResponseDto> => {
        return fetcher<WorkerWithRelationsResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    startWorker: (id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl}/${id}/start`, 'POST');
    },

    terminateWorker: (id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl}/${id}/terminate`, 'POST');
    },

    deleteWorker: (id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },
};

export default workersApi;
import { fetcher } from "@/core/api/fetcher";
import { CreateWorkerStorageTypeDto, WorkerStorageTypeResponseDto } from "./worker-storage-type.api.types";

const baseUrl = '/hive/storage-types';

export const workerStorageTypeApi = {
    findAll(): Promise<WorkerStorageTypeResponseDto[]> {
        return fetcher<WorkerStorageTypeResponseDto[]>(baseUrl);
    },

    create(data: CreateWorkerStorageTypeDto): Promise<WorkerStorageTypeResponseDto> {
        return fetcher<WorkerStorageTypeResponseDto>(baseUrl, 'POST', data);
    },

    update(id: number, data: CreateWorkerStorageTypeDto): Promise<WorkerStorageTypeResponseDto> {
        return fetcher<WorkerStorageTypeResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    delete(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },
}

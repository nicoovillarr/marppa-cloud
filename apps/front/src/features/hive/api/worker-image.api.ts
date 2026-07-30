import { fetcher } from "@/core/api/fetcher"
import { CreateWorkerImageDto, WorkerImageResponseDto } from "./worker-image.api.types"

const baseUrl = '/hive/images';

export const workerImageApi = {
    listImages(): Promise<WorkerImageResponseDto[]> {
        return fetcher<WorkerImageResponseDto[]>(baseUrl);
    },

    create(data: CreateWorkerImageDto): Promise<WorkerImageResponseDto> {
        return fetcher<WorkerImageResponseDto>(baseUrl, 'POST', data);
    },

    update(id: number, data: CreateWorkerImageDto): Promise<WorkerImageResponseDto> {
        return fetcher<WorkerImageResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    delete(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },
}

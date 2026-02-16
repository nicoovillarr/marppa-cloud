import { fetcher } from "@/libs/fetcher";
import { CreateWorkerDto, WorkerResponseDto, WorkerWithRelationsResponseDto } from "./worker.api.types";

const baseUrl = '/hive/worker';

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
};

export default workersApi;
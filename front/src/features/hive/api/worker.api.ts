import { fetcher } from "@/libs/fetcher";
import { CreateWorkerDto, WorkerResponseDto, WorkerWithRelationsResponseDto } from "./worker.api.types";

const baseUrl = '/hive/worker';

const workersApi = {
    listWorkers: (): Promise<WorkerWithRelationsResponseDto[]> => {
        return fetcher<WorkerWithRelationsResponseDto[]>(baseUrl, 'GET');
    },

    createWorker: (dto: CreateWorkerDto): Promise<WorkerResponseDto> => {
        return fetcher<WorkerResponseDto>(baseUrl, 'POST', {
            ...dto
        });
    },
};

export default workersApi;
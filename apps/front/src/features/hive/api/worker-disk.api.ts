import { fetcher } from "@/core/api/fetcher";
import {
    CreateWorkerDiskDto,
    UpdateWorkerDiskDto,
    WorkerDiskResponseDto,
} from "./worker-disk.api.types";

const baseUrl = "/hive/disks";

export const workerDiskApi = {
    list(): Promise<WorkerDiskResponseDto[]> {
        return fetcher<WorkerDiskResponseDto[]>(baseUrl);
    },

    listByWorker(workerId: string): Promise<WorkerDiskResponseDto[]> {
        return fetcher<WorkerDiskResponseDto[]>(`${baseUrl}/worker/${workerId}`);
    },

    create(data: CreateWorkerDiskDto): Promise<WorkerDiskResponseDto> {
        return fetcher<WorkerDiskResponseDto>(baseUrl, "POST", data);
    },

    update(id: number, data: UpdateWorkerDiskDto): Promise<WorkerDiskResponseDto> {
        return fetcher<WorkerDiskResponseDto>(`${baseUrl}/${id}`, "PUT", data);
    },

    attach(id: number, workerId: string): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}/attach`, "POST", { workerId });
    },

    detach(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}/detach`, "POST");
    },

    delete(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, "DELETE");
    },
};

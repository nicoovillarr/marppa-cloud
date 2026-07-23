import workersApi from "../api/worker.api";
import { CreateWorkerDto, WorkerResponseDto, WorkerWithRelationsResponseDto } from "../api/worker.api.types";

export class WorkerService {
    async listWorkers(): Promise<WorkerWithRelationsResponseDto[]> {
        const dtos = await workersApi.listWorkers();
        return dtos;
    }

    async getWorker(id: string): Promise<WorkerWithRelationsResponseDto> {
        const dto = await workersApi.getWorker(id);
        return dto;
    }

    async createWorker(
        name: string,
        imageId: number,
        flavorId: number,
        publicSSH?: string,
    ): Promise<WorkerWithRelationsResponseDto> {
        const dto = await workersApi.createWorker({
            name,
            imageId,
            flavorId,
            publicSSH
        });

        return dto;
    }

    async updateWorker(id: string, name: string): Promise<WorkerWithRelationsResponseDto> {
        const dto = await workersApi.updateWorker(id, { name });
        return dto;
    }

    async startWorker(id: string): Promise<void> {
        await workersApi.startWorker(id);
    }

    async terminateWorker(id: string): Promise<void> {
        await workersApi.terminateWorker(id);
    }

    async deleteWorker(id: string): Promise<void> {
        await workersApi.deleteWorker(id);
    }
}
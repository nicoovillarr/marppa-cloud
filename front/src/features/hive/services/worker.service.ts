import workersApi from "../api/worker.api";
import { WorkerResponseDto, WorkerWithRelationsResponseDto } from "../api/worker.api.types";

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
        sshKey?: string,
    ): Promise<WorkerWithRelationsResponseDto> {
        const dto = await workersApi.createWorker({
            name,
            imageId,
            flavorId,
            sshKey
        });

        return dto;
    }
}
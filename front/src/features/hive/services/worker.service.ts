import workersApi from "../api/worker.api";
import { WorkerResponseDto, WorkerWithRelationsResponseDto } from "../api/worker.api.types";

export class WorkerService {
    async listWorkers(): Promise<WorkerWithRelationsResponseDto[]> {
        const dtos = await workersApi.listWorkers();
        return dtos;
    }

    async createWorker(
        name: string,
        imageId: number,
        flavorId: number
    ): Promise<WorkerResponseDto> {
        const dto = await workersApi.createWorker({
            name,
            imageId,
            flavorId
        });

        return dto;
    }
}
import { workerImageApi } from "../api/worker-image.api";
import { WorkerImageResponseDto } from "../api/worker-image.api.types";

export class WorkerImageService {
    async findAll(): Promise<WorkerImageResponseDto[]> {
        const dtos = await workerImageApi.listImages();
        return dtos;
    }
}
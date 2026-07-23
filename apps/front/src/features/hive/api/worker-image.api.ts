import { fetcher } from "@/core/api/fetcher"
import { WorkerImageResponseDto } from "./worker-image.api.types"

const baseUrl = '/hive/images';

export const workerImageApi = {
    listImages(): Promise<WorkerImageResponseDto[]> {
        return fetcher<WorkerImageResponseDto[]>(baseUrl);
    }
}
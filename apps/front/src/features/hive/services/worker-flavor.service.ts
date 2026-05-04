import { workerFlavorApi } from "../api/worker-flavor.api";
import { WorkerFlavorResponseDto } from "../api/worker-flavor.api.types";

export class WorkerFlavorService {
    async listAvailableFlavors(): Promise<WorkerFlavorResponseDto[]> {
        return await workerFlavorApi.findAll();
    }
}
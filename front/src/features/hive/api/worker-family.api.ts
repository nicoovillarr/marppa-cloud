import { fetcher } from "@/core/api/fetcher";
import { WorkerFamilyWithRelationsResponseDto } from "./worker-family.api.types";

const baseUrl = '/hive/families';

export const workerFamilyApi = {
    findAll(): Promise<WorkerFamilyWithRelationsResponseDto[]> {
        return fetcher<WorkerFamilyWithRelationsResponseDto[]>(baseUrl);
    }
}
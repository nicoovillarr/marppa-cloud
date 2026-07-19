import { fetcher } from "@/core/api/fetcher";
import { CreateFiberDto, FiberResponseDto } from "./fiber.api.types";

const baseUrl = (zoneId: string, nodeId: string) =>
    `/mesh/zones/${zoneId}/nodes/${nodeId}/fibers`;

export const fiberApi = {
    getAll: (zoneId: string, nodeId: string): Promise<FiberResponseDto[]> => {
        return fetcher<FiberResponseDto[]>(baseUrl(zoneId, nodeId));
    },

    create: (zoneId: string, nodeId: string, data: CreateFiberDto): Promise<FiberResponseDto> => {
        return fetcher<FiberResponseDto>(baseUrl(zoneId, nodeId), 'POST', data);
    },

    delete: (zoneId: string, nodeId: string, fiberId: string | number): Promise<void> => {
        return fetcher<void>(`${baseUrl(zoneId, nodeId)}/${fiberId}`, 'DELETE');
    },
};

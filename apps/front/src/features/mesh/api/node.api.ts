import { fetcher } from "@/core/api/fetcher";
import { CreateNodeDto, NodeResponseDto, NodeWithFibers } from "./node.api.types";

const baseUrl = (zoneId: string) => `/mesh/zones/${zoneId}/nodes`;

export const nodeApi = {
    getAll: (zoneId: string): Promise<NodeWithFibers[]> => {
        return fetcher<NodeWithFibers[]>(baseUrl(zoneId));
    },

    getById: (zoneId: string, id: string): Promise<NodeWithFibers> => {
        return fetcher<NodeWithFibers>(`${baseUrl(zoneId)}/${id}`);
    },

    create: (zoneId: string, data: CreateNodeDto): Promise<NodeResponseDto> => {
        return fetcher<NodeResponseDto>(baseUrl(zoneId), 'POST', data);
    },

    delete: (zoneId: string, id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl(zoneId)}/${id}`, 'DELETE');
    },

    stop: (zoneId: string, id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl(zoneId)}/${id}/stop`, 'POST');
    },

    start: (zoneId: string, id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl(zoneId)}/${id}/start`, 'POST');
    },
};

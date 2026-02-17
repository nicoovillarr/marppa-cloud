import { fetcher } from "@/libs/fetcher";
import { CreateZoneDto, ZoneWithNodes, ZoneWithNodesAndFibers } from "./zone.api.types";

const baseUrl = '/mesh/zones';

export const zoneApi = {
    fetchAll(): Promise<ZoneWithNodes[]> {
        return fetcher<ZoneWithNodes[]>(`${baseUrl}`);
    },

    fetchById(id: string): Promise<ZoneWithNodesAndFibers> {
        return fetcher<ZoneWithNodesAndFibers>(`${baseUrl}/${id}`);
    },

    create(data: CreateZoneDto): Promise<ZoneWithNodes> {
        return fetcher<ZoneWithNodes>(`${baseUrl}`, 'POST', data);
    },

    update(id: string, data: Partial<CreateZoneDto>): Promise<ZoneWithNodes> {
        return fetcher<ZoneWithNodes>(`${baseUrl}/${id}`, 'PUT', data);
    },
}
import { fetcher } from "@/libs/fetcher";
import { CreatePortalDto, PortalWithTranspondersResponseDto } from "./portal.api.types";
import { PortalType } from "../models/portal-type.enum";

const baseUrl = '/orbit/portals';

export const portalApi = {
    fetchPortalTypes(): Promise<PortalType[]> {
        return fetcher(`${baseUrl}/types`);
    },

    fetchAll(): Promise<PortalWithTranspondersResponseDto[]> {
        return fetcher(baseUrl);
    },

    fetchById(id: string): Promise<PortalWithTranspondersResponseDto> {
        return fetcher(`${baseUrl}/${id}`);
    },

    create(data: CreatePortalDto): Promise<PortalWithTranspondersResponseDto> {
        return fetcher(baseUrl, 'POST', data);
    },

    update(id: string, data: Partial<CreatePortalDto>): Promise<PortalWithTranspondersResponseDto> {
        return fetcher(`${baseUrl}/${id}`, 'PUT', data);
    },

    delete(id: string): Promise<void> {
        return fetcher(`${baseUrl}/${id}`, 'DELETE');
    },
}
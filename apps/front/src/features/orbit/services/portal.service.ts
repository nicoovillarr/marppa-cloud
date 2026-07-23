import { portalApi } from "../api/portal.api";
import { CreatePortalDto, PortalWithTranspondersResponseDto, PortalWithTranspondersWithNodesResponseDto } from "../api/portal.api.types";

export class PortalService {
    async fetchPortalTypes(): Promise<string[]> {
        return await portalApi.fetchPortalTypes();
    };

    async fetchAll(): Promise<PortalWithTranspondersResponseDto[]> {
        return await portalApi.fetchAll();
    };

    async fetchById(id: string): Promise<PortalWithTranspondersWithNodesResponseDto> {
        return await portalApi.fetchById(id);
    };

    async create(data: CreatePortalDto): Promise<PortalWithTranspondersResponseDto> {
        return await portalApi.create(data);
    };

    async update(id: string, data: Partial<CreatePortalDto>): Promise<PortalWithTranspondersResponseDto> {
        return await portalApi.update(id, data);
    };

    async delete(id: string): Promise<void> {
        return await portalApi.delete(id);
    };
}
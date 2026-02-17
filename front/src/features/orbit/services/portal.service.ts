import { portalApi } from "../api/portal.api";
import { CreatePortalDto, PortalResponseDto } from "../api/portal.api.types";

export class PortalService {
    async fetchPortalTypes(): Promise<string[]> {
        return await portalApi.fetchPortalTypes();
    };

    async fetchAll(): Promise<PortalResponseDto[]> {
        return await portalApi.fetchAll();
    };

    async fetchById(id: string): Promise<PortalResponseDto> {
        return await portalApi.fetchById(id);
    };

    async create(data: CreatePortalDto): Promise<PortalResponseDto> {
        return await portalApi.create(data);
    };

    async update(id: string, data: Partial<CreatePortalDto>): Promise<PortalResponseDto> {
        return await portalApi.update(id, data);
    };

    async delete(id: string): Promise<void> {
        return await portalApi.delete(id);
    };
}
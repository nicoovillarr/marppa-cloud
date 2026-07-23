import { transponderApi } from "../api/transponder.api";
import { TransponderResponseModel, CreateTransponderDto } from "../api/transponder.api.type";
import { TransponderMode } from "../models/transponder-mode.enum";

export class TransponderService {
    public async fetchTransponderModes(): Promise<TransponderMode[]> {
        return await transponderApi.fetchTransponderModes();
    };

    public async fetchAll(portalId: string): Promise<TransponderResponseModel[]> {
        return await transponderApi.fetchAll(portalId);
    };

    public async fetchById(portalId: string, transponderId: string): Promise<TransponderResponseModel> {
        return await transponderApi.fetchById(portalId, transponderId);
    };

    public async create(portalId: string, data: CreateTransponderDto): Promise<TransponderResponseModel> {
        return await transponderApi.create(portalId, data);
    };

    public async update(portalId: string, transponderId: string, data: Partial<CreateTransponderDto>): Promise<TransponderResponseModel> {
        return await transponderApi.update(portalId, transponderId, data);
    };

    public async delete(portalId: string, transponderId: string): Promise<void> {
        return await transponderApi.delete(portalId, transponderId);
    };
}
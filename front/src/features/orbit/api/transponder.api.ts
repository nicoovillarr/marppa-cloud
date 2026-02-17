import { fetcher } from "@/core/api/fetcher";
import { CreateTransponderDto, TransponderResponseModel } from "./transponder.api.type";
import { TransponderMode } from "../models/transponder-mode.enum";

const baseUrl = (portalId: string) => `/orbit/portals/${portalId}/transponders`;

export const transponderApi = {
    fetchTransponderModes(): Promise<TransponderMode[]> {
        return fetcher(`${baseUrl}/modes`);
    },

    fetchAll(portalId: string): Promise<TransponderResponseModel[]> {
        return fetcher<TransponderResponseModel[]>(baseUrl(portalId));
    },

    fetchById(portalId: string, id: string): Promise<TransponderResponseModel> {
        return fetcher<TransponderResponseModel>(`${baseUrl(portalId)}/${id}`);
    },

    create(portalId: string, data: CreateTransponderDto): Promise<TransponderResponseModel> {
        return fetcher<TransponderResponseModel>(baseUrl(portalId), 'POST', data);
    },

    update(portalId: string, id: string, data: Partial<CreateTransponderDto>): Promise<TransponderResponseModel> {
        return fetcher<TransponderResponseModel>(`${baseUrl(portalId)}/${id}`, 'PUT', data);
    },

    delete(portalId: string, id: string): Promise<void> {
        return fetcher(`${baseUrl(portalId)}/${id}`, 'DELETE');
    },
}
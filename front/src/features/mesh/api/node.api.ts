import { fetcher } from "@/libs/fetcher";
import { NodeWithFibers } from "./node.api.types";

const baseUrl = '/mesh/node';

export const nodeApi = {
    getAll: (): Promise<NodeWithFibers[]> => {
        return fetcher<NodeWithFibers[]>(baseUrl);
    },

    getById: (id: string): Promise<NodeWithFibers> => {
        return fetcher<NodeWithFibers>(`${baseUrl}/${id}`);
    },
};
import { fetcher } from "@/core/api/fetcher";
import { AtomResponseDto, AtomWithRelationsResponseDto, CreateAtomDto } from "./atom.api.types";

const baseUrl = '/nucleus/atoms';

const atomsApi = {
    listAtoms: (): Promise<AtomWithRelationsResponseDto[]> => {
        return fetcher<AtomWithRelationsResponseDto[]>(baseUrl, 'GET');
    },

    getAtom: (id: string): Promise<AtomWithRelationsResponseDto> => {
        return fetcher<AtomWithRelationsResponseDto>(`${baseUrl}/${id}`, 'GET');
    },

    createAtom: (dto: CreateAtomDto): Promise<AtomResponseDto> => {
        return fetcher<AtomResponseDto>(baseUrl, 'POST', dto);
    },

    updateAtom: (id: string, data: { name: string }): Promise<AtomResponseDto> => {
        return fetcher<AtomResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    startAtom: (id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl}/${id}/start`, 'POST');
    },

    terminateAtom: (id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl}/${id}/terminate`, 'POST');
    },

    deleteAtom: (id: string): Promise<void> => {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },
};

export default atomsApi;

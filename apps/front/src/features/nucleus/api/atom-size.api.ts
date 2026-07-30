import { fetcher } from "@/core/api/fetcher"
import { AtomSizeResponseDto, CreateAtomSizeDto, UpdateAtomSizeDto } from "./atom-size.api.types"

const baseUrl = '/nucleus/sizes';

export const atomSizeApi = {
    listSizes(includeDeprecated = false): Promise<AtomSizeResponseDto[]> {
        return fetcher<AtomSizeResponseDto[]>(baseUrl, 'GET', { includeDeprecated });
    },

    create(data: CreateAtomSizeDto): Promise<AtomSizeResponseDto> {
        return fetcher<AtomSizeResponseDto>(baseUrl, 'POST', data);
    },

    revise(id: number, data: UpdateAtomSizeDto): Promise<AtomSizeResponseDto> {
        return fetcher<AtomSizeResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    deprecate(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },

    restore(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}/restore`, 'POST');
    },
}

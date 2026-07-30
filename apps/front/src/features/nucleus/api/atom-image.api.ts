import { fetcher } from "@/core/api/fetcher"
import { AtomImageResponseDto, CreateAtomImageDto } from "./atom-image.api.types"

const baseUrl = '/nucleus/images';

export const atomImageApi = {
    listImages(): Promise<AtomImageResponseDto[]> {
        return fetcher<AtomImageResponseDto[]>(baseUrl);
    },

    create(data: CreateAtomImageDto): Promise<AtomImageResponseDto> {
        return fetcher<AtomImageResponseDto>(baseUrl, 'POST', data);
    },

    update(id: number, data: CreateAtomImageDto): Promise<AtomImageResponseDto> {
        return fetcher<AtomImageResponseDto>(`${baseUrl}/${id}`, 'PUT', data);
    },

    delete(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, 'DELETE');
    },
}

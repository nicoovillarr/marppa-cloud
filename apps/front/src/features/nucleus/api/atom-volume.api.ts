import { fetcher } from "@/core/api/fetcher";
import {
    AtomVolumeResponseDto,
    CreateAtomVolumeDto,
    UpdateAtomVolumeDto,
    ResizeAtomVolumeDto,
} from "./atom-volume.api.types";

const baseUrl = "/nucleus/volumes";

export const atomVolumeApi = {
    list(): Promise<AtomVolumeResponseDto[]> {
        return fetcher<AtomVolumeResponseDto[]>(baseUrl);
    },

    listByAtom(atomId: string): Promise<AtomVolumeResponseDto[]> {
        return fetcher<AtomVolumeResponseDto[]>(`${baseUrl}/atom/${atomId}`);
    },

    create(data: CreateAtomVolumeDto): Promise<AtomVolumeResponseDto> {
        return fetcher<AtomVolumeResponseDto>(baseUrl, "POST", data);
    },

    update(id: number, data: UpdateAtomVolumeDto): Promise<AtomVolumeResponseDto> {
        return fetcher<AtomVolumeResponseDto>(`${baseUrl}/${id}`, "PUT", data);
    },

    resize(id: number, data: ResizeAtomVolumeDto): Promise<AtomVolumeResponseDto> {
        return fetcher<AtomVolumeResponseDto>(`${baseUrl}/${id}/resize`, "POST", data);
    },

    attach(id: number, atomId: string, mountPoint: string): Promise<AtomVolumeResponseDto> {
        return fetcher<AtomVolumeResponseDto>(`${baseUrl}/${id}/attach`, "POST", { atomId, mountPoint });
    },

    detach(id: number): Promise<AtomVolumeResponseDto> {
        return fetcher<AtomVolumeResponseDto>(`${baseUrl}/${id}/detach`, "POST");
    },

    delete(id: number): Promise<void> {
        return fetcher<void>(`${baseUrl}/${id}`, "DELETE");
    },
};

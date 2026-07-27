import { fetcher } from "@/core/api/fetcher"
import { AtomImageResponseDto } from "./atom-image.api.types"

const baseUrl = '/nucleus/images';

export const atomImageApi = {
    listImages(): Promise<AtomImageResponseDto[]> {
        return fetcher<AtomImageResponseDto[]>(baseUrl);
    }
}

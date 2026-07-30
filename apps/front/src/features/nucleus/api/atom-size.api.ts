import { fetcher } from "@/core/api/fetcher"
import { AtomSizeResponseDto } from "./atom-size.api.types"

const baseUrl = '/nucleus/sizes';

export const atomSizeApi = {
    listSizes(): Promise<AtomSizeResponseDto[]> {
        return fetcher<AtomSizeResponseDto[]>(baseUrl);
    }
}

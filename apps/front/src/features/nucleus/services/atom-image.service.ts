import { atomImageApi } from "../api/atom-image.api";
import { AtomImageResponseDto } from "../api/atom-image.api.types";

export class AtomImageService {
    async findAll(): Promise<AtomImageResponseDto[]> {
        const dtos = await atomImageApi.listImages();
        return dtos;
    }
}

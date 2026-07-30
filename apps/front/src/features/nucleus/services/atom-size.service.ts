import { atomSizeApi } from "../api/atom-size.api";
import { AtomSizeResponseDto } from "../api/atom-size.api.types";

export class AtomSizeService {
    async findAll(): Promise<AtomSizeResponseDto[]> {
        const dtos = await atomSizeApi.listSizes();
        return dtos;
    }
}

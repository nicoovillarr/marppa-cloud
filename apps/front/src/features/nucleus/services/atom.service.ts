import atomsApi from "../api/atom.api";
import {
    AtomResponseDto,
    AtomWithRelationsResponseDto,
    CreateAtomEnvVarDto,
} from "../api/atom.api.types";

export class AtomService {
    async listAtoms(): Promise<AtomWithRelationsResponseDto[]> {
        const dtos = await atomsApi.listAtoms();
        return dtos;
    }

    async getAtom(id: string): Promise<AtomWithRelationsResponseDto> {
        const dto = await atomsApi.getAtom(id);
        return dto;
    }

    async createAtom(
        name: string,
        imageId: number,
        sizeId: number,
        tag: string,
        envVars?: CreateAtomEnvVarDto[],
    ): Promise<AtomResponseDto> {
        const dto = await atomsApi.createAtom({ name, imageId, sizeId, tag, envVars });
        return dto;
    }

    async updateAtom(id: string, name: string): Promise<AtomResponseDto> {
        const dto = await atomsApi.updateAtom(id, { name });
        return dto;
    }

    async startAtom(id: string): Promise<void> {
        await atomsApi.startAtom(id);
    }

    async terminateAtom(id: string): Promise<void> {
        await atomsApi.terminateAtom(id);
    }

    async deleteAtom(id: string): Promise<void> {
        await atomsApi.deleteAtom(id);
    }
}

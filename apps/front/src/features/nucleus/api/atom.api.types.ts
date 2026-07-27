import { NodeResponseDto } from "src/features/mesh/api/node.api.types";
import { AtomImageResponseDto } from "./atom-image.api.types";

export type CreateAtomEnvVarDto = {
    key: string;
    value: string;
}

export type CreateAtomDto = {
    name: string;
    imageId: number;
    ownerId?: string;
    envVars?: CreateAtomEnvVarDto[];
}

export type AtomResponseDto = {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date | null;
    updatedBy: string | null;
    ownerId: string;
    imageId: number;
}

export type AtomWithRelationsResponseDto = AtomResponseDto & {
    image: AtomImageResponseDto;
    node: NodeResponseDto | null;
}

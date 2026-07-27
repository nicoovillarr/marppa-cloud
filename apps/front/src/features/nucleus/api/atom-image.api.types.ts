export type AtomImageResponseDto = {
    id: number;
    name: string;
    description: string | null;
    registry: string;
    repository: string;
    tag: string;
    digest: string | null;
    architecture: string;
}

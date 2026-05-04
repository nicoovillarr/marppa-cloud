export type WorkerImageResponseDto = {
    id: number;
    name: string;
    description: string | null;
    osType: string;
    osVersion: string | null;
    osFamily: string;
    imageUrl: string;
    architecture: string;
    virtualizationType: string;
    workerStorageTypeId: string | null;
}
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

export type CreateWorkerImageDto = {
    name: string;
    osType: string;
    osFamily: string;
    imageUrl: string;
    architecture: string;
    virtualizationType: string;
    description?: string;
    osVersion?: string;
    workerStorageTypeId?: number;
}

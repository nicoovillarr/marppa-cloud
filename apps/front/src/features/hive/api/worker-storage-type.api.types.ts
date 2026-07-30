export type WorkerStorageTypeResponseDto = {
    id: number;
    name: string;
    description: string | null;
    persistent: boolean;
    attachable: boolean;
    shared: boolean;
}

export type CreateWorkerStorageTypeDto = {
    name: string;
    persistent: boolean;
    attachable: boolean;
    shared: boolean;
    description?: string;
}

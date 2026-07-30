export type WorkerFlavorResponseDto = {
    id: number;
    name: string;
    version: number;
    cpuCores: number;
    ramMB: number;
    pricePerHourCents: number;
    deprecatedAt: Date | null;
    familyId: number;
};

export type CreateWorkerFlavorDto = {
    name: string;
    familyId: number;
    cpuCores: number;
    ramMB: number;
    pricePerHourCents?: number;
};

export type UpdateWorkerFlavorDto = {
    cpuCores: number;
    ramMB: number;
    pricePerHourCents?: number;
};

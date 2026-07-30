export type WorkerFlavorResponseDto = {
    id: number;
    name: string;
    version: number;
    cpuCores: number;
    ramMB: number;
    diskGB: number;
    pricePerHourCents: number;
    deprecatedAt: Date | null;
    familyId: number;
};

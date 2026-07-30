export type AtomSizeResponseDto = {
    id: number;
    name: string;
    version: number;
    cpuCores: number;
    ramMB: number;
    pricePerHourCents: number;
    deprecatedAt: Date | null;
}

export type CreateAtomSizeDto = {
    name: string;
    cpuCores: number;
    ramMB: number;
    pricePerHourCents?: number;
}

export type UpdateAtomSizeDto = {
    cpuCores: number;
    ramMB: number;
    pricePerHourCents?: number;
}

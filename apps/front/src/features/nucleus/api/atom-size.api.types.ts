export type AtomSizeResponseDto = {
    id: number;
    name: string;
    version: number;
    cpuCores: number;
    ramMB: number;
    pricePerHourCents: number;
    deprecatedAt: Date | null;
}

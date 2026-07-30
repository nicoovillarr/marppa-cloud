import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';

export const ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL = Symbol(
  'ADMIN_HOST_CAPACITY_REPOSITORY',
);

export interface HostCapacityOverrideWrite {
  cpuCoresOverride?: number | null;
  ramMBOverride?: number | null;
  diskGBOverride?: number | null;
}

export abstract class AdminHostCapacityRepository {
  abstract findAll(): Promise<HostCapacityModel[]>;
  abstract findByHostname(hostname: string): Promise<HostCapacityModel | null>;
  abstract updateOverride(
    hostname: string,
    data: HostCapacityOverrideWrite,
  ): Promise<HostCapacityModel>;
  abstract delete(hostname: string): Promise<void>;
}

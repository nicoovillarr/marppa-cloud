import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';

export const ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL = Symbol(
  'ADMIN_HOST_CAPACITY_REPOSITORY',
);

export interface HostCapacityWrite {
  cpuCores: number;
  ramMB: number;
  diskGB: number;
}

export abstract class AdminHostCapacityRepository {
  abstract findAll(): Promise<HostCapacityModel[]>;
  abstract upsert(
    hostname: string,
    data: HostCapacityWrite,
  ): Promise<HostCapacityModel>;
  abstract delete(hostname: string): Promise<void>;
}

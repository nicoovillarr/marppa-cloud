import { HostCapacityModel } from '../models/host-capacity.model';

export const HOST_CAPACITY_REPOSITORY_SYMBOL = Symbol(
  'HOST_CAPACITY_REPOSITORY',
);

export abstract class HostCapacityRepository {
  abstract findAll(): Promise<HostCapacityModel[]>;
}

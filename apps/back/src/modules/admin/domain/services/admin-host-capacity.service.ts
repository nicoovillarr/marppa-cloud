import { Inject, Injectable } from '@nestjs/common';

import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import {
  ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL,
  AdminHostCapacityRepository,
} from '../repositories/admin-host-capacity.repository';
import { UpsertHostCapacityDto } from '@/admin/presentation/dtos/upsert-host-capacity.dto';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

const HOSTNAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

@Injectable()
export class AdminHostCapacityService {
  constructor(
    @Inject(ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL)
    private readonly repository: AdminHostCapacityRepository,
  ) { }

  findAll(): Promise<HostCapacityModel[]> {
    return this.repository.findAll();
  }

  upsert(
    hostname: string,
    data: UpsertHostCapacityDto,
  ): Promise<HostCapacityModel> {
    return this.repository.upsert(this.assertHostname(hostname), data);
  }

  delete(hostname: string): Promise<void> {
    return this.repository.delete(this.assertHostname(hostname));
  }

  private assertHostname(hostname: string): string {
    if (!HOSTNAME.test(hostname)) {
      throw new BadRequestError(`"${hostname}" is not a valid hostname`);
    }

    return hostname;
  }
}

import { Inject, Injectable } from '@nestjs/common';

import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';
import {
  ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL,
  AdminHostCapacityRepository,
} from '../repositories/admin-host-capacity.repository';
import { UpdateHostCapacityDto } from '@/admin/presentation/dtos/update-host-capacity.dto';
import { CapacityOverrideTooHighError } from '../errors/capacity-override-too-high.error';

const HOSTNAME =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

@Injectable()
export class AdminHostCapacityService {
  constructor(
    @Inject(ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL)
    private readonly repository: AdminHostCapacityRepository,
  ) { }

  findAll(): Promise<HostCapacityModel[]> {
    return this.repository.findAll();
  }

  async updateOverride(
    hostname: string,
    data: UpdateHostCapacityDto,
  ): Promise<HostCapacityModel> {
    const host = await this.findByHostname(hostname);

    this.assertWithinReported('vCPU', data.cpuCoresOverride, host.cpuCores);
    this.assertWithinReported('memory', data.ramMBOverride, host.ramMB);
    this.assertWithinReported('disk', data.diskGBOverride, host.diskGB);

    return this.repository.updateOverride(host.hostname, data);
  }

  async delete(hostname: string): Promise<void> {
    const host = await this.findByHostname(hostname);
    await this.repository.delete(host.hostname);
  }

  private async findByHostname(hostname: string): Promise<HostCapacityModel> {
    if (!HOSTNAME.test(hostname)) {
      throw new BadRequestError(`"${hostname}" is not a valid hostname`);
    }

    const host = await this.repository.findByHostname(hostname);
    if (!host) {
      throw new NotFoundError();
    }

    return host;
  }

  private assertWithinReported(
    resource: string,
    override: number | null | undefined,
    reported: number,
  ): void {
    if (override != null && override > reported) {
      throw new CapacityOverrideTooHighError(resource, override, reported);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { HostCapacity } from '@prisma/client';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import {
  AdminHostCapacityRepository,
  HostCapacityOverrideWrite,
} from '@/admin/domain/repositories/admin-host-capacity.repository';

@Injectable()
export class AdminHostCapacityPrismaRepository
  implements AdminHostCapacityRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<HostCapacityModel[]> {
    const hosts = await this.prisma.hostCapacity.findMany({
      orderBy: { hostname: 'asc' },
    });

    return hosts.map(toModel);
  }

  async findByHostname(hostname: string): Promise<HostCapacityModel | null> {
    const host = await this.prisma.hostCapacity.findUnique({
      where: { hostname },
    });

    return host ? toModel(host) : null;
  }

  async updateOverride(
    hostname: string,
    data: HostCapacityOverrideWrite,
  ): Promise<HostCapacityModel> {
    const host = await this.prisma.hostCapacity.update({
      where: { hostname },
      data,
    });

    return toModel(host);
  }

  async delete(hostname: string): Promise<void> {
    await this.prisma.hostCapacity.delete({
      where: { hostname },
    });
  }
}

function toModel(host: HostCapacity): HostCapacityModel {
  return new HostCapacityModel(
    host.hostname,
    host.cpuCores,
    host.ramMB,
    host.diskGB,
    host.reportedAt,
    {
      cpuCoresOverride: host.cpuCoresOverride,
      ramMBOverride: host.ramMBOverride,
      diskGBOverride: host.diskGBOverride,
    },
  );
}

import { Injectable } from '@nestjs/common';
import { HostCapacity } from '@prisma/client';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import {
  AdminHostCapacityRepository,
  HostCapacityWrite,
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

  async upsert(
    hostname: string,
    data: HostCapacityWrite,
  ): Promise<HostCapacityModel> {
    const host = await this.prisma.hostCapacity.upsert({
      where: { hostname },
      create: { hostname, ...data },
      update: data,
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
  );
}

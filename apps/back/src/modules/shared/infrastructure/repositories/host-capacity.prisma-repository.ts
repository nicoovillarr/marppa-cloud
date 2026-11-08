import { Injectable } from '@nestjs/common';
import { HostCapacity } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { HostCapacityRepository } from '@/shared/domain/repositories/host-capacity.repository';
import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';

@Injectable()
export class HostCapacityPrismaRepository implements HostCapacityRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<HostCapacityModel[]> {
    const hosts = await this.prisma.hostCapacity.findMany();

    return hosts.map(toModel);
  }
}

function toModel(host: HostCapacity): HostCapacityModel {
  return new HostCapacityModel(
    {
      hostname: host.hostname,
      cpuCores: host.cpuCores,
      ramMB: host.ramMB,
      workerDiskGB: host.workerDiskGB,
      atomVolumeGB: host.atomVolumeGB,
      workerDiskMedia: host.workerDiskMedia,
      atomVolumeMedia: host.atomVolumeMedia,
      reportedAt: host.reportedAt,
    },
    {
      cpuCoresOverride: host.cpuCoresOverride,
      ramMBOverride: host.ramMBOverride,
      workerDiskGBOverride: host.workerDiskGBOverride,
      atomVolumeGBOverride: host.atomVolumeGBOverride,
    },
  );
}

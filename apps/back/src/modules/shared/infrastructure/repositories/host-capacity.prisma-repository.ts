import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { HostCapacityRepository } from '@/shared/domain/repositories/host-capacity.repository';
import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';

@Injectable()
export class HostCapacityPrismaRepository implements HostCapacityRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<HostCapacityModel[]> {
    const hosts = await this.prisma.hostCapacity.findMany();

    return hosts.map(
      (host) =>
        new HostCapacityModel(
          host.hostname,
          host.cpuCores,
          host.ramMB,
          host.diskGB,
          host.reportedAt,
        ),
    );
  }
}

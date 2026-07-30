import { Injectable } from '@nestjs/common';
import { Prisma, ResourceStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { CommittedResourcesRepository } from '@/shared/domain/repositories/committed-resources.repository';
import { ResourceUsageModel } from '@/shared/domain/models/resource-usage.model';

const RUNNING_STATUSES = [
  ResourceStatus.QUEUED,
  ResourceStatus.PROVISIONING,
  ResourceStatus.UPDATING,
  ResourceStatus.ACTIVE,
  ResourceStatus.TERMINATING,
];

@Injectable()
export class CommittedResourcesPrismaRepository
  implements CommittedResourcesRepository {
  constructor(private readonly prisma: PrismaService) { }

  async sumProvisioned(): Promise<ResourceUsageModel> {
    const alive = { status: { not: ResourceStatus.DELETED } };

    const [workers, atoms] = await Promise.all([
      this.sumWorkers(alive),
      this.sumAtoms(alive),
    ]);

    return workers.plus(atoms);
  }

  async sumRunning(excludedResourceId?: string): Promise<ResourceUsageModel> {
    const running = { status: { in: RUNNING_STATUSES } };
    const excluded = excludedResourceId
      ? { id: { not: excludedResourceId } }
      : {};

    const [workers, atoms] = await Promise.all([
      this.sumWorkers({ ...running, ...excluded }),
      this.sumAtoms({ ...running, ...excluded }),
    ]);

    return workers.plus(atoms);
  }

  private async sumWorkers(
    where: Prisma.WorkerWhereInput,
  ): Promise<ResourceUsageModel> {
    const { _sum } = await this.prisma.worker.aggregate({
      where,
      _sum: { cpuCores: true, ramMB: true, diskGB: true },
    });

    return new ResourceUsageModel(
      _sum.cpuCores ?? 0,
      _sum.ramMB ?? 0,
      _sum.diskGB ?? 0,
    );
  }

  private async sumAtoms(
    where: Prisma.AtomWhereInput,
  ): Promise<ResourceUsageModel> {
    const { _sum } = await this.prisma.atom.aggregate({
      where,
      _sum: { cpuCores: true, ramMB: true },
    });

    return new ResourceUsageModel(_sum.cpuCores ?? 0, _sum.ramMB ?? 0, 0);
  }
}

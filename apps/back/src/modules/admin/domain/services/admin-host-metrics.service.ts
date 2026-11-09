import { Inject, Injectable } from '@nestjs/common';

import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import {
  ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL,
  AdminHostCapacityRepository,
} from '../repositories/admin-host-capacity.repository';
import {
  ADMIN_HOST_METRICS_REPOSITORY_SYMBOL,
  AdminHostMetricsRepository,
} from '../repositories/admin-host-metrics.repository';
import {
  HeadroomCheck,
  HostMetricSampleModel,
  HostMetricsModel,
} from '../models/host-metrics.model';

const DEFAULT_STALE_AFTER_MS = 180_000;

@Injectable()
export class AdminHostMetricsService {
  constructor(
    @Inject(ADMIN_HOST_METRICS_REPOSITORY_SYMBOL)
    private readonly metricsRepository: AdminHostMetricsRepository,

    @Inject(ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL)
    private readonly capacityRepository: AdminHostCapacityRepository,
  ) { }

  async findLatest(now: Date = new Date()): Promise<HostMetricsModel[]> {
    const [samples, hosts] = await Promise.all([
      this.metricsRepository.findLatestPerHost(),
      this.capacityRepository.findAll(),
    ]);

    const capacityByHost = new Map(hosts.map((host) => [host.hostname, host]));

    return samples.map((sample) =>
      toMetrics(sample, capacityByHost.get(sample.hostname) ?? null, now, staleAfterMs()),
    );
  }
}

function toMetrics(
  sample: HostMetricSampleModel,
  capacity: HostCapacityModel | null,
  now: Date,
  staleAfter: number,
): HostMetricsModel {
  const externalPercent =
    sample.platformCpuPercent == null
      ? null
      : round(Math.max(sample.cpuPercent - sample.platformCpuPercent, 0));
  const externalMB =
    sample.platformMemoryMB == null
      ? null
      : Math.max(sample.memoryUsedMB - sample.platformMemoryMB, 0);
  const externalCores =
    externalPercent == null ? null : round((externalPercent / 100) * sample.cpuCores);

  return {
    hostname: sample.hostname,
    sampledAt: sample.sampledAt,
    stale: now.getTime() - sample.sampledAt.getTime() > staleAfter,
    cpu: {
      cores: sample.cpuCores,
      usedPercent: sample.cpuPercent,
      platformPercent: sample.platformCpuPercent,
      externalPercent,
      loadAverage1m: sample.loadAverage1m,
    },
    memory: {
      totalMB: sample.memoryTotalMB,
      usedMB: sample.memoryUsedMB,
      platformMB: sample.platformMemoryMB,
      externalMB,
    },
    atomVolumePool:
      sample.atomVolumePoolGB == null || sample.atomVolumeAllocatedGB == null
        ? null
        : { sizeGB: sample.atomVolumePoolGB, allocatedGB: sample.atomVolumeAllocatedGB },
    filesystems: sample.filesystems,
    headroom: {
      cpuCores: headroom(
        capacity && capacity.cpuCores - capacity.effectiveCpuCores,
        externalCores,
      ),
      memoryMB: headroom(
        capacity && capacity.ramMB - capacity.effectiveRamMB,
        externalMB,
      ),
    },
  };
}

function headroom(reserved: number | null, external: number | null): HeadroomCheck | null {
  if (reserved == null || external == null) {
    return null;
  }

  return { reserved, external, exceeded: external > reserved };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function staleAfterMs(): number {
  const parsed = Number(process.env.HOST_METRICS_STALE_AFTER_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_AFTER_MS;
}

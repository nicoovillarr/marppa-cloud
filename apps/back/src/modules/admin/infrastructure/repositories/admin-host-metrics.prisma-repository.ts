import { Injectable } from '@nestjs/common';
import { HostMetricSample, Prisma, StorageMedia } from '@prisma/client';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { AdminHostMetricsRepository } from '@/admin/domain/repositories/admin-host-metrics.repository';
import {
  FilesystemMetrics,
  HostMetricSampleModel,
} from '@/admin/domain/models/host-metrics.model';

const STORAGE_MEDIA = new Set<string>(Object.values(StorageMedia));

@Injectable()
export class AdminHostMetricsPrismaRepository
  implements AdminHostMetricsRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findLatestPerHost(): Promise<HostMetricSampleModel[]> {
    const samples = await this.prisma.hostMetricSample.findMany({
      distinct: ['hostname'],
      orderBy: [{ hostname: 'asc' }, { sampledAt: 'desc' }],
    });

    return samples.map(toModel);
  }
}

function toModel(sample: HostMetricSample): HostMetricSampleModel {
  return {
    hostname: sample.hostname,
    sampledAt: sample.sampledAt,
    cpuCores: sample.cpuCores,
    cpuPercent: sample.cpuPercent,
    platformCpuPercent: sample.platformCpuPercent,
    loadAverage1m: sample.loadAverage1m,
    memoryTotalMB: sample.memoryTotalMB,
    memoryUsedMB: sample.memoryUsedMB,
    platformMemoryMB: sample.platformMemoryMB,
    atomVolumePoolGB: sample.atomVolumePoolGB,
    atomVolumeAllocatedGB: sample.atomVolumeAllocatedGB,
    filesystems: toFilesystems(sample.filesystems),
  };
}

function toFilesystems(value: Prisma.JsonValue): FilesystemMetrics[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }

    const { mountPoint, device, fsType, sizeBytes, usedBytes, media } = entry;
    if (
      typeof mountPoint !== 'string' ||
      typeof device !== 'string' ||
      typeof sizeBytes !== 'number' ||
      typeof usedBytes !== 'number'
    ) {
      return [];
    }

    return [
      {
        mountPoint,
        device,
        fsType: typeof fsType === 'string' ? fsType : '',
        sizeBytes,
        usedBytes,
        media:
          typeof media === 'string' && STORAGE_MEDIA.has(media)
            ? (media as StorageMedia)
            : null,
      },
    ];
  });
}

import { Test, TestingModule } from '@nestjs/testing';
import { StorageMedia } from '@marppa-cloud/db';

import { HostCapacityModel } from '@/shared/domain/models/host-capacity.model';
import { AdminHostMetricsService } from './admin-host-metrics.service';
import { ADMIN_HOST_METRICS_REPOSITORY_SYMBOL } from '../repositories/admin-host-metrics.repository';
import { ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL } from '../repositories/admin-host-capacity.repository';
import { HostMetricSampleModel } from '../models/host-metrics.model';

const NOW = new Date('2026-11-09T12:00:00Z');

function sample(overrides: Partial<HostMetricSampleModel> = {}): HostMetricSampleModel {
  return {
    hostname: 'home-server',
    sampledAt: new Date(NOW.getTime() - 30_000),
    cpuCores: 12,
    cpuPercent: 30,
    platformCpuPercent: 20,
    loadAverage1m: 1.5,
    memoryTotalMB: 32026,
    memoryUsedMB: 12000,
    platformMemoryMB: 9000,
    atomVolumePoolGB: 260,
    atomVolumeAllocatedGB: 13,
    filesystems: [
      {
        mountPoint: '/',
        device: '/dev/mapper/vg_system-root',
        fsType: 'ext4',
        sizeBytes: 100,
        usedBytes: 40,
        media: StorageMedia.NVME,
      },
    ],
    ...overrides,
  };
}

function capacity(cpuCoresOverride: number | null, ramMBOverride: number | null) {
  return new HostCapacityModel(
    {
      hostname: 'home-server',
      cpuCores: 12,
      ramMB: 32026,
      workerDiskGB: 439,
      atomVolumeGB: 260,
      reportedAt: NOW,
    },
    { cpuCoresOverride, ramMBOverride },
  );
}

describe('AdminHostMetricsService', () => {
  let service: AdminHostMetricsService;

  const metricsRepository = { findLatestPerHost: jest.fn() };
  const capacityRepository = { findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminHostMetricsService,
        { provide: ADMIN_HOST_METRICS_REPOSITORY_SYMBOL, useValue: metricsRepository },
        { provide: ADMIN_HOST_CAPACITY_REPOSITORY_SYMBOL, useValue: capacityRepository },
      ],
    }).compile();

    service = module.get(AdminHostMetricsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should split host usage into platform and external', async () => {
    metricsRepository.findLatestPerHost.mockResolvedValue([sample()]);
    capacityRepository.findAll.mockResolvedValue([capacity(10, 30000)]);

    const [metrics] = await service.findLatest(NOW);

    expect(metrics.stale).toBe(false);
    expect(metrics.cpu).toMatchObject({ platformPercent: 20, externalPercent: 10 });
    expect(metrics.memory).toMatchObject({ platformMB: 9000, externalMB: 3000 });
    expect(metrics.atomVolumePool).toEqual({ sizeGB: 260, allocatedGB: 13 });
    expect(metrics.headroom).toEqual({
      cpuCores: { reserved: 2, external: 1.2, exceeded: false },
      memoryMB: { reserved: 2026, external: 3000, exceeded: true },
    });
  });

  it('should flag external usage when no headroom was reserved', async () => {
    metricsRepository.findLatestPerHost.mockResolvedValue([sample()]);
    capacityRepository.findAll.mockResolvedValue([capacity(null, null)]);

    const [metrics] = await service.findLatest(NOW);

    expect(metrics.headroom.memoryMB).toEqual({ reserved: 0, external: 3000, exceeded: true });
  });

  it('should leave the platform split unknown when cgroups could not be read', async () => {
    metricsRepository.findLatestPerHost.mockResolvedValue([
      sample({ platformCpuPercent: null, platformMemoryMB: null }),
    ]);
    capacityRepository.findAll.mockResolvedValue([capacity(10, 30000)]);

    const [metrics] = await service.findLatest(NOW);

    expect(metrics.cpu.externalPercent).toBeNull();
    expect(metrics.memory.externalMB).toBeNull();
    expect(metrics.headroom).toEqual({ cpuCores: null, memoryMB: null });
  });

  it('should never report negative external usage', async () => {
    metricsRepository.findLatestPerHost.mockResolvedValue([
      sample({ memoryUsedMB: 8000, platformMemoryMB: 9000, cpuPercent: 10, platformCpuPercent: 12 }),
    ]);
    capacityRepository.findAll.mockResolvedValue([]);

    const [metrics] = await service.findLatest(NOW);

    expect(metrics.memory.externalMB).toBe(0);
    expect(metrics.cpu.externalPercent).toBe(0);
    expect(metrics.headroom).toEqual({ cpuCores: null, memoryMB: null });
  });

  it('should mark a host stale once its last sample is older than the threshold', async () => {
    metricsRepository.findLatestPerHost.mockResolvedValue([
      sample({ sampledAt: new Date(NOW.getTime() - 181_000) }),
    ]);
    capacityRepository.findAll.mockResolvedValue([]);

    const [metrics] = await service.findLatest(NOW);

    expect(metrics.stale).toBe(true);
  });
});

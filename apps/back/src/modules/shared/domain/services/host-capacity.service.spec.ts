import { Test, TestingModule } from '@nestjs/testing';
import { StorageMedia } from '@marppa-cloud/db';
import { HostCapacityService } from './host-capacity.service';
import { COMMITTED_RESOURCES_REPOSITORY_SYMBOL } from '../repositories/committed-resources.repository';
import { HOST_CAPACITY_REPOSITORY_SYMBOL } from '../repositories/host-capacity.repository';
import { ResourceUsageModel } from '../models/resource-usage.model';
import {
  HostCapacityModel,
  HostCapacityReport,
} from '../models/host-capacity.model';
import { HostCapacityExceededError } from '../errors/host-capacity-exceeded.error';

function host(report: Partial<HostCapacityReport> = {}): HostCapacityModel {
  return new HostCapacityModel({
    hostname: 'home-server',
    cpuCores: 12,
    ramMB: 32026,
    workerDiskGB: 439,
    atomVolumeGB: 260,
    reportedAt: new Date(),
    ...report,
  });
}

describe('HostCapacityService', () => {
  let service: HostCapacityService;

  const mockCommittedResourcesRepository = {
    sumProvisioned: jest.fn(),
    sumRunning: jest.fn(),
  };

  const mockHostCapacityRepository = {
    findAll: jest.fn(),
  };

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      HIVE_HOST_VCPU: '4',
      HIVE_VCPU_OVERCOMMIT: '2',
      HIVE_HOST_RAM_MB: '8192',
      HIVE_HOST_DISK_GB: '100',
      HIVE_HOST_ATOM_VOLUME_GB: '50',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostCapacityService,
        {
          provide: COMMITTED_RESOURCES_REPOSITORY_SYMBOL,
          useValue: mockCommittedResourcesRepository,
        },
        {
          provide: HOST_CAPACITY_REPOSITORY_SYMBOL,
          useValue: mockHostCapacityRepository,
        },
      ],
    }).compile();

    service = module.get<HostCapacityService>(HostCapacityService);

    mockHostCapacityRepository.findAll.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('assertFitsOnCreate', () => {
    it('should accept a worker that fits the remaining worker disk', async () => {
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        new ResourceUsageModel(2, 4096, 60, 0),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 2, ramMB: 4096, workerDiskGB: 40 }),
      ).resolves.toBeUndefined();
    });

    it('should reject a worker that does not fit the remaining worker disk', async () => {
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        new ResourceUsageModel(2, 4096, 80, 0),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 2, ramMB: 4096, workerDiskGB: 40 }),
      ).rejects.toThrow(HostCapacityExceededError);
    });

    it('should not charge atom volumes against the worker disk pool', async () => {
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        new ResourceUsageModel(0, 0, 0, 45),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 0, ramMB: 0, workerDiskGB: 100 }),
      ).resolves.toBeUndefined();
    });

    it('should reject an atom volume that does not fit the atom volume pool', async () => {
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        new ResourceUsageModel(0, 0, 0, 45),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 0, ramMB: 0, atomVolumeGB: 10 }),
      ).rejects.toThrow(HostCapacityExceededError);
    });

    it('should not charge worker disks against the atom volume pool', async () => {
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        new ResourceUsageModel(0, 0, 100, 0),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 0, ramMB: 0, atomVolumeGB: 50 }),
      ).resolves.toBeUndefined();
    });

    it('should reject a flavor larger than the whole host memory', async () => {
      await expect(
        service.assertFitsOnCreate({ cpuCores: 1, ramMB: 16384, workerDiskGB: 10 }),
      ).rejects.toThrow(HostCapacityExceededError);
      expect(mockCommittedResourcesRepository.sumProvisioned).not.toHaveBeenCalled();
    });

    it('should skip the disk accounting when no disk is requested', async () => {
      await expect(
        service.assertFitsOnCreate({ cpuCores: 1, ramMB: 1024 }),
      ).resolves.toBeUndefined();
      expect(mockCommittedResourcesRepository.sumProvisioned).not.toHaveBeenCalled();
    });

    it('should apply the vCPU overcommit factor to the host cores', async () => {
      await expect(
        service.assertFitsOnCreate({ cpuCores: 8, ramMB: 1024 }),
      ).resolves.toBeUndefined();

      await expect(
        service.assertFitsOnCreate({ cpuCores: 9, ramMB: 1024 }),
      ).rejects.toThrow(HostCapacityExceededError);
    });
  });

  describe('reported host capacity', () => {
    beforeEach(() => {
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        ResourceUsageModel.empty(),
      );
    });

    it('should prefer what the host reported over the configured budget', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([host()]);

      await expect(
        service.assertFitsOnCreate({
          cpuCores: 8,
          ramMB: 16384,
          workerDiskGB: 200,
          atomVolumeGB: 200,
        }),
      ).resolves.toBeUndefined();
    });

    it('should honour an atom volume override below what the host reported', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([
        new HostCapacityModel(
          {
            hostname: 'home-server',
            cpuCores: 12,
            ramMB: 32026,
            workerDiskGB: 439,
            atomVolumeGB: 260,
            reportedAt: new Date(),
          },
          { atomVolumeGBOverride: 100 },
        ),
      ]);

      await expect(
        service.assertFitsOnCreate({ cpuCores: 0, ramMB: 0, atomVolumeGB: 101 }),
      ).rejects.toThrow(HostCapacityExceededError);
    });

    it('should add up every reported host', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([
        host({ hostname: 'host-a', cpuCores: 4, ramMB: 8192, workerDiskGB: 100 }),
        host({ hostname: 'host-b', cpuCores: 4, ramMB: 8192, workerDiskGB: 100 }),
      ]);

      await expect(
        service.assertFitsOnCreate({ cpuCores: 16, ramMB: 16384, workerDiskGB: 200 }),
      ).resolves.toBeUndefined();
    });

    it('should fall back to the configured budget when no host reported yet', async () => {
      await expect(
        service.assertFitsOnCreate({ cpuCores: 1, ramMB: 16384, workerDiskGB: 10 }),
      ).rejects.toThrow(HostCapacityExceededError);
    });
  });

  describe('assertFitsOnStart', () => {
    it('should ignore the worker being started when adding up running usage', async () => {
      mockCommittedResourcesRepository.sumRunning.mockResolvedValue(
        new ResourceUsageModel(2, 4096, 40, 0),
      );

      await service.assertFitsOnStart('w-000001', { cpuCores: 2, ramMB: 4096 });

      expect(mockCommittedResourcesRepository.sumRunning).toHaveBeenCalledWith(
        'w-000001',
      );
    });

    it('should reject a start that would oversubscribe memory', async () => {
      mockCommittedResourcesRepository.sumRunning.mockResolvedValue(
        new ResourceUsageModel(2, 6144, 40, 0),
      );

      await expect(
        service.assertFitsOnStart('w-000001', { cpuCores: 1, ramMB: 4096 }),
      ).rejects.toThrow(HostCapacityExceededError);
    });
  });

  describe('usage', () => {
    it('should report running and provisioned usage against each budget', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([
        host({
          workerDiskMedia: StorageMedia.SSD,
          atomVolumeMedia: StorageMedia.SSD,
        }),
      ]);
      mockCommittedResourcesRepository.sumRunning.mockResolvedValue(
        new ResourceUsageModel(3, 6144, 60, 13),
      );
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        new ResourceUsageModel(5, 10240, 80, 13),
      );

      await expect(service.usage()).resolves.toEqual({
        vcpu: { running: 3, provisioned: 5, budget: 24 },
        ramMB: { running: 6144, provisioned: 10240, budget: 32026 },
        workerDiskGB: { provisioned: 80, budget: 439, media: [StorageMedia.SSD] },
        atomVolumeGB: { provisioned: 13, budget: 260, media: [StorageMedia.SSD] },
      });
    });

    it('should list each distinct media across hosts and skip unknown ones', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([
        host({ hostname: 'host-a', workerDiskMedia: StorageMedia.NVME }),
        host({ hostname: 'host-b', workerDiskMedia: StorageMedia.SSD }),
        host({ hostname: 'host-c', workerDiskMedia: StorageMedia.NVME }),
      ]);
      mockCommittedResourcesRepository.sumRunning.mockResolvedValue(
        ResourceUsageModel.empty(),
      );
      mockCommittedResourcesRepository.sumProvisioned.mockResolvedValue(
        ResourceUsageModel.empty(),
      );

      const usage = await service.usage();

      expect(usage.workerDiskGB.media).toEqual([
        StorageMedia.NVME,
        StorageMedia.SSD,
      ]);
      expect(usage.atomVolumeGB.media).toEqual([]);
    });
  });
});

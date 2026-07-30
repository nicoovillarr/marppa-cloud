import { Test, TestingModule } from '@nestjs/testing';
import { HiveCapacityService } from './hive-capacity.service';
import { WORKER_REPOSITORY_SYMBOL } from '../repositories/worker.repository';
import { HOST_CAPACITY_REPOSITORY_SYMBOL } from '../repositories/host-capacity.repository';
import { WorkerResourceUsageModel } from '../models/worker-resource-usage.model';
import { HostCapacityModel } from '../models/host-capacity.model';
import { HiveCapacityExceededError } from '../errors/hive-capacity-exceeded.error';

describe('HiveCapacityService', () => {
  let service: HiveCapacityService;

  const mockWorkerRepository = {
    sumProvisionedResources: jest.fn(),
    sumRunningResources: jest.fn(),
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HiveCapacityService,
        {
          provide: WORKER_REPOSITORY_SYMBOL,
          useValue: mockWorkerRepository,
        },
        {
          provide: HOST_CAPACITY_REPOSITORY_SYMBOL,
          useValue: mockHostCapacityRepository,
        },
      ],
    }).compile();

    service = module.get<HiveCapacityService>(HiveCapacityService);

    mockHostCapacityRepository.findAll.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('assertFitsOnCreate', () => {
    it('should accept a worker that fits the remaining disk', async () => {
      mockWorkerRepository.sumProvisionedResources.mockResolvedValue(
        new WorkerResourceUsageModel(2, 4096, 60),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 2, ramMB: 4096, diskGB: 40 }),
      ).resolves.toBeUndefined();
    });

    it('should reject a worker that does not fit the remaining disk', async () => {
      mockWorkerRepository.sumProvisionedResources.mockResolvedValue(
        new WorkerResourceUsageModel(2, 4096, 80),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 2, ramMB: 4096, diskGB: 40 }),
      ).rejects.toThrow(HiveCapacityExceededError);
    });

    it('should reject a flavor larger than the whole host memory', async () => {
      await expect(
        service.assertFitsOnCreate({ cpuCores: 1, ramMB: 16384, diskGB: 10 }),
      ).rejects.toThrow(HiveCapacityExceededError);
      expect(mockWorkerRepository.sumProvisionedResources).not.toHaveBeenCalled();
    });

    it('should apply the vCPU overcommit factor to the host cores', async () => {
      mockWorkerRepository.sumProvisionedResources.mockResolvedValue(
        new WorkerResourceUsageModel(0, 0, 0),
      );

      await expect(
        service.assertFitsOnCreate({ cpuCores: 8, ramMB: 1024, diskGB: 10 }),
      ).resolves.toBeUndefined();

      await expect(
        service.assertFitsOnCreate({ cpuCores: 9, ramMB: 1024, diskGB: 10 }),
      ).rejects.toThrow(HiveCapacityExceededError);
    });
  });

  describe('reported host capacity', () => {
    beforeEach(() => {
      mockWorkerRepository.sumProvisionedResources.mockResolvedValue(
        new WorkerResourceUsageModel(0, 0, 0),
      );
    });

    it('should prefer what the host reported over the configured budget', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([
        new HostCapacityModel('home-server', 12, 32026, 439, new Date()),
      ]);

      await expect(
        service.assertFitsOnCreate({ cpuCores: 8, ramMB: 16384, diskGB: 200 }),
      ).resolves.toBeUndefined();
    });

    it('should add up every reported host', async () => {
      mockHostCapacityRepository.findAll.mockResolvedValue([
        new HostCapacityModel('host-a', 4, 8192, 100, new Date()),
        new HostCapacityModel('host-b', 4, 8192, 100, new Date()),
      ]);

      await expect(
        service.assertFitsOnCreate({ cpuCores: 16, ramMB: 16384, diskGB: 200 }),
      ).resolves.toBeUndefined();
    });

    it('should fall back to the configured budget when no host reported yet', async () => {
      await expect(
        service.assertFitsOnCreate({ cpuCores: 1, ramMB: 16384, diskGB: 10 }),
      ).rejects.toThrow(HiveCapacityExceededError);
    });
  });

  describe('assertFitsOnStart', () => {
    it('should ignore the worker being started when adding up running usage', async () => {
      mockWorkerRepository.sumRunningResources.mockResolvedValue(
        new WorkerResourceUsageModel(2, 4096, 40),
      );

      await service.assertFitsOnStart('w-000001', {
        cpuCores: 2,
        ramMB: 4096,
        diskGB: 40,
      });

      expect(mockWorkerRepository.sumRunningResources).toHaveBeenCalledWith(
        'w-000001',
      );
    });

    it('should reject a start that would oversubscribe memory', async () => {
      mockWorkerRepository.sumRunningResources.mockResolvedValue(
        new WorkerResourceUsageModel(2, 6144, 40),
      );

      await expect(
        service.assertFitsOnStart('w-000001', {
          cpuCores: 1,
          ramMB: 4096,
          diskGB: 40,
        }),
      ).rejects.toThrow(HiveCapacityExceededError);
    });
  });
});

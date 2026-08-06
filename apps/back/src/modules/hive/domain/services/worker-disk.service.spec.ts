import { Test, TestingModule } from '@nestjs/testing';
import { WorkerDiskService } from './worker-disk.service';
import {
  WorkerDiskRepository,
  WORKER_DISK_REPOSITORY_SYMBOL,
} from '../repositories/worker-disk.repository';
import { WorkerDiskEntity } from '../entities/worker-disk.entity';
import { WorkerEntity } from '../entities/worker.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerDiskDto } from '@/hive/presentation/dtos/create-worker-disk.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { WorkerService } from './worker.service';
import { WorkerStorageTypeService } from './worker-storage-type.service';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { WorkerDiskInvalidStatusError } from '../errors/worker-disk-invalid-status.error';
import { WorkerDiskNotAttachableError } from '../errors/worker-disk-not-attachable.error';
import { WorkerDiskReservedMountPointError } from '../errors/worker-disk-reserved-mount-point.error';
import {
  WorkerDiskAlreadyAttachedError,
  WorkerDiskStillAttachedError,
} from '../errors/worker-disk-attachment.error';
import { WorkerInvalidStatusError } from '../errors/worker-invalid-status.error';

describe('WorkerDiskService', () => {
  let service: WorkerDiskService;
  let repository: WorkerDiskRepository;

  const diskWith = (
    overrides: {
      status?: ResourceStatus;
      workerId?: string;
    } = {},
  ): WorkerDiskEntity =>
    new WorkerDiskEntity(
      'Test Volume',
      overrides.status ?? ResourceStatus.INACTIVE,
      100,
      'c-000001',
      1,
      'u-000001',
      {
        id: 1,
        hostPath: '/var/lib/libvirt/images/volumes/vol-1.qcow2',
        mountPoint: '/mnt/data',
        workerId: overrides.workerId,
      },
    );

  const workerWith = (status: ResourceStatus): WorkerEntity =>
    ({ id: 'w-000001', status, ownerId: 'c-000001' }) as WorkerEntity;

  const mockWorkerDiskRepository = {
    findById: jest.fn(),
    findByOwnerIds: jest.fn(),
    findByWorkerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockWorkerService = { findById: jest.fn() };
  const mockWorkerStorageTypeService = { findById: jest.fn() };
  const mockCompanyHierarchyService = { selfAndDescendants: jest.fn() };
  const mockHostCapacityService = { assertFitsOnCreate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerDiskService,
        {
          provide: WORKER_DISK_REPOSITORY_SYMBOL,
          useValue: mockWorkerDiskRepository,
        },
        { provide: WorkerService, useValue: mockWorkerService },
        {
          provide: WorkerStorageTypeService,
          useValue: mockWorkerStorageTypeService,
        },
        {
          provide: CompanyHierarchyService,
          useValue: mockCompanyHierarchyService,
        },
        { provide: HostCapacityService, useValue: mockHostCapacityService },
      ],
    }).compile();

    service = module.get<WorkerDiskService>(WorkerDiskService);
    repository = module.get<WorkerDiskRepository>(
      WORKER_DISK_REPOSITORY_SYMBOL,
    );

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      role: 'OWNER',
    } as any);

    mockCompanyHierarchyService.selfAndDescendants.mockResolvedValue([
      'c-000001',
    ]);
    mockWorkerStorageTypeService.findById.mockResolvedValue({
      name: 'ssd',
      attachable: true,
    });
    mockHostCapacityService.assertFitsOnCreate.mockResolvedValue(undefined);
    mockWorkerDiskRepository.findByWorkerId.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns a volume by id', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(diskWith());

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result.name).toBe('Test Volume');
    });

    it('throws NotFoundError when the volume does not exist', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByOwnerId', () => {
    it('scopes the listing to the readable companies', async () => {
      mockWorkerDiskRepository.findByOwnerIds.mockResolvedValue([diskWith()]);

      const result = await service.findByOwnerId();

      expect(repository.findByOwnerIds).toHaveBeenCalledWith(['c-000001']);
      expect(result).toHaveLength(1);
    });

    it('rejects an owner outside the hierarchy', async () => {
      await expect(service.findByOwnerId('c-999999')).rejects.toThrow();
    });
  });

  describe('create', () => {
    const dto: CreateWorkerDiskDto = {
      name: 'New Volume',
      sizeGiB: 200,
      ownerId: 'c-000001',
      storageTypeId: 1,
      mountPoint: '/mnt/new',
    };

    it('creates the volume QUEUED and unattached', async () => {
      mockWorkerDiskRepository.create.mockImplementation((e) => e);

      const result = await service.create(dto);

      expect(mockHostCapacityService.assertFitsOnCreate).toHaveBeenCalledWith({
        cpuCores: 0,
        ramMB: 0,
        diskGB: 200,
      });
      expect(result.status).toBe(ResourceStatus.QUEUED);
      expect(result.workerId).toBeUndefined();
      expect(result.hostPath).toBeUndefined();
    });

    it('rejects a storage type that cannot be attached', async () => {
      mockWorkerStorageTypeService.findById.mockResolvedValue({
        name: 'ephemeral',
        attachable: false,
      });

      await expect(service.create(dto)).rejects.toThrow(
        WorkerDiskNotAttachableError,
      );
    });

    it('rejects a mount point owned by the guest OS', async () => {
      await expect(
        service.create({ ...dto, mountPoint: '/etc/secrets' }),
      ).rejects.toThrow(WorkerDiskReservedMountPointError);
    });
  });

  describe('attach', () => {
    it('links the volume to the worker and queues the event', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(diskWith());
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.INACTIVE),
      );
      mockWorkerDiskRepository.update.mockImplementation((e) => e);

      await service.attach(1, 'w-000001');

      const saved = (repository.update as jest.Mock).mock.calls[0][0];
      expect(saved.workerId).toBe('w-000001');
      expect(saved.status).toBe(ResourceStatus.QUEUED);
      expect(saved.deviceTarget).toBe('vdb');
    });

    it('picks the first device target the worker has free', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(diskWith());
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.INACTIVE),
      );
      mockWorkerDiskRepository.findByWorkerId.mockResolvedValue([
        { deviceTarget: 'vdb' },
        { deviceTarget: 'vdc' },
      ]);
      mockWorkerDiskRepository.update.mockImplementation((e) => e);

      await service.attach(1, 'w-000001');

      const saved = (repository.update as jest.Mock).mock.calls[0][0];
      expect(saved.deviceTarget).toBe('vdd');
    });

    it('refuses a volume that is already attached', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(
        diskWith({ workerId: 'w-000002' }),
      );
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.INACTIVE),
      );

      await expect(service.attach(1, 'w-000001')).rejects.toThrow(
        WorkerDiskAlreadyAttachedError,
      );
    });

    it('refuses a running worker', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(diskWith());
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.ACTIVE),
      );

      await expect(service.attach(1, 'w-000001')).rejects.toThrow(
        WorkerInvalidStatusError,
      );
    });

    it('refuses a volume that is not INACTIVE', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(
        diskWith({ status: ResourceStatus.QUEUED }),
      );
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.INACTIVE),
      );

      await expect(service.attach(1, 'w-000001')).rejects.toThrow(
        WorkerDiskInvalidStatusError,
      );
    });
  });

  describe('detach', () => {
    it('queues the detach of an attached volume', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(
        diskWith({ status: ResourceStatus.ACTIVE, workerId: 'w-000001' }),
      );
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.INACTIVE),
      );
      mockWorkerDiskRepository.update.mockImplementation((e) => e);

      await service.detach(1);

      const saved = (repository.update as jest.Mock).mock.calls[0][0];
      expect(saved.status).toBe(ResourceStatus.QUEUED);
      expect(saved.workerId).toBe('w-000001');
    });

    it('refuses while the worker is running', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(
        diskWith({ status: ResourceStatus.ACTIVE, workerId: 'w-000001' }),
      );
      mockWorkerService.findById.mockResolvedValue(
        workerWith(ResourceStatus.ACTIVE),
      );

      await expect(service.detach(1)).rejects.toThrow(WorkerInvalidStatusError);
    });
  });

  describe('delete', () => {
    it('queues the delete of a detached volume', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(diskWith());
      mockWorkerDiskRepository.update.mockImplementation((e) => e);

      await service.delete(1);

      const saved = (repository.update as jest.Mock).mock.calls[0][0];
      expect(saved.status).toBe(ResourceStatus.QUEUED);
    });

    it('refuses a volume still attached to a worker', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(
        diskWith({ workerId: 'w-000001' }),
      );

      await expect(service.delete(1)).rejects.toThrow(
        WorkerDiskStillAttachedError,
      );
    });

    it('refuses a volume that is still provisioning', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(
        diskWith({ status: ResourceStatus.PROVISIONING }),
      );

      await expect(service.delete(1)).rejects.toThrow(
        WorkerDiskInvalidStatusError,
      );
    });
  });
});

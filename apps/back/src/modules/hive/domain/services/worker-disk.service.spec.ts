import { Test, TestingModule } from '@nestjs/testing';
import { WorkerDiskService } from './worker-disk.service';
import {
  WorkerDiskRepository,
  WORKER_DISK_REPOSITORY_SYMBOL,
} from '../repositories/worker-disk.repository';
import { WorkerDiskEntity } from '../entities/worker-disk.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerDiskDto } from '@/hive/presentation/dtos/create-worker-disk.dto';
import { UpdateWorkerDiskDto } from '@/hive/presentation/dtos/update-worker-disk.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';

describe('WorkerDiskService', () => {
  let service: WorkerDiskService;
  let repository: WorkerDiskRepository;

  const mockWorkerDisk: WorkerDiskEntity = new WorkerDiskEntity(
    'Test Disk',
    100,
    '/dev/sda1',
    'c-000001',
    1,
    'u-000001',
    {
      id: 1,
      mountPoint: '/mnt/data',
      isBoot: false,
      workerId: 'w-000001',
    },
  );

  const mockWorkerDiskRepository = {
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerDiskService,
        {
          provide: WORKER_DISK_REPOSITORY_SYMBOL,
          useValue: mockWorkerDiskRepository,
        },
      ],
    }).compile();

    service = module.get<WorkerDiskService>(WorkerDiskService);
    repository = module.get<WorkerDiskRepository>(
      WORKER_DISK_REPOSITORY_SYMBOL,
    );

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a worker disk by id', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(mockWorkerDisk);

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWorkerDisk);
    });

    it('should throw NotFoundError if worker disk not found', async () => {
      mockWorkerDiskRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByOwnerId', () => {
    it('should return worker disks by owner id', async () => {
      mockWorkerDiskRepository.findByOwnerId.mockResolvedValue([
        mockWorkerDisk,
      ]);

      const result = await service.findByOwnerId('c-000001');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([mockWorkerDisk]);
    });

    it('should return empty array if no worker disks found', async () => {
      mockWorkerDiskRepository.findByOwnerId.mockResolvedValue([]);

      const result = await service.findByOwnerId('c-999999');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-999999');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a worker disk successfully', async () => {
      const dto: CreateWorkerDiskDto = {
        name: 'New Disk',
        sizeGiB: 200,
        hostPath: '/dev/sdb1',
        ownerId: 'c-000001',
        storageTypeId: 1,
        mountPoint: '/mnt/new',
        isBoot: false,
        workerId: 'w-000001',
      };

      mockWorkerDiskRepository.create.mockResolvedValue(mockWorkerDisk);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.any(WorkerDiskEntity),
      );
      expect(result).toEqual(mockWorkerDisk);
    });

    it('should create a worker disk with workerId', async () => {
      const dto: CreateWorkerDiskDto = {
        name: 'New Disk',
        sizeGiB: 200,
        hostPath: '/dev/sdb1',
        ownerId: 'c-000001',
        storageTypeId: 1,
        mountPoint: '/mnt/new',
        isBoot: false,
        workerId: 'w-000002',
      };

      mockWorkerDiskRepository.create.mockResolvedValue(mockWorkerDisk);

      await service.create(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(WorkerDiskEntity);
    });
  });

  describe('update', () => {
    it('should update a worker disk successfully', async () => {
      const dto: UpdateWorkerDiskDto = {
        name: 'Updated Disk',
        sizeGiB: 300,
        hostPath: '/dev/sdb1',
        ownerId: 'c-000001',
        storageTypeId: 1,
        mountPoint: '/mnt/new',
        isBoot: false,
        workerId: 'w-000001',
      };

      mockWorkerDiskRepository.findById.mockResolvedValue(mockWorkerDisk);
      mockWorkerDiskRepository.update.mockResolvedValue(mockWorkerDisk);

      const result = await service.update(1, dto);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(
        expect.any(WorkerDiskEntity),
      );
      expect(result).toEqual(mockWorkerDisk);
    });

    it('should throw NotFoundError if worker disk not found', async () => {
      const dto: UpdateWorkerDiskDto = {
        name: 'Updated Disk',
        sizeGiB: 300,
        hostPath: '/dev/sdb1',
        ownerId: 'c-000001',
        storageTypeId: 1,
        mountPoint: '/mnt/new',
        isBoot: false,
        workerId: 'w-000002',
      };

      mockWorkerDiskRepository.findById.mockResolvedValue(null);

      await expect(service.update(999999, dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete a worker disk', async () => {
      mockWorkerDiskRepository.delete.mockResolvedValue(undefined);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});

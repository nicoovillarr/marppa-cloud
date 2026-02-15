import { Test, TestingModule } from '@nestjs/testing';
import { WorkerStorageTypeService } from './worker-storage-type.service';
import {
  WorkerStorageTypeRepository,
  WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL,
} from '../repositories/worker-storage-type.repository';
import { WorkerStorageTypeEntity } from '../entities/worker-storage-type.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerStorageTypeDto } from '@/hive/presentation/dtos/create-worker-storage-type.dto';
import { UpdateWorkerStorageTypeDto } from '@/hive/presentation/dtos/update-worker-storage-type.dto';

describe('WorkerStorageTypeService', () => {
  let service: WorkerStorageTypeService;
  let repository: WorkerStorageTypeRepository;

  const mockWorkerStorageType: WorkerStorageTypeEntity =
    new WorkerStorageTypeEntity('Test Storage Type', true, true, false, {
      id: 1,
      description: 'Test storage type description',
    });

  const mockWorkerStorageTypeRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerStorageTypeService,
        {
          provide: WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL,
          useValue: mockWorkerStorageTypeRepository,
        },
      ],
    }).compile();

    service = module.get<WorkerStorageTypeService>(WorkerStorageTypeService);
    repository = module.get<WorkerStorageTypeRepository>(
      WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a worker storage type by id', async () => {
      mockWorkerStorageTypeRepository.findById.mockResolvedValue(
        mockWorkerStorageType,
      );

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWorkerStorageType);
    });

    it('should throw NotFoundError if worker storage type not found', async () => {
      mockWorkerStorageTypeRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createWorkerStorageType', () => {
    it('should create a worker storage type successfully', async () => {
      const dto: CreateWorkerStorageTypeDto = {
        name: 'New Storage Type',
        persistent: false,
        attachable: true,
        shared: true,
        description: 'New storage type description',
      };

      mockWorkerStorageTypeRepository.create.mockResolvedValue(
        mockWorkerStorageType,
      );

      const result = await service.createWorkerStorageType(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.any(WorkerStorageTypeEntity),
      );
      expect(result).toEqual(mockWorkerStorageType);
    });

    it('should create a worker storage type without description', async () => {
      const dto: CreateWorkerStorageTypeDto = {
        name: 'Minimal Storage Type',
        persistent: true,
        attachable: false,
        shared: false,
      };

      mockWorkerStorageTypeRepository.create.mockResolvedValue(
        mockWorkerStorageType,
      );

      await service.createWorkerStorageType(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(WorkerStorageTypeEntity);
    });
  });

  describe('updateWorkerStorageType', () => {
    it('should update a worker storage type successfully', async () => {
      const dto: UpdateWorkerStorageTypeDto = {
        name: 'Updated Storage Type',
        persistent: false,
        attachable: false,
        shared: false,
      };

      mockWorkerStorageTypeRepository.findById.mockResolvedValue(
        mockWorkerStorageType,
      );
      mockWorkerStorageTypeRepository.update.mockResolvedValue(
        mockWorkerStorageType,
      );

      const result = await service.updateWorkerStorageType(1, dto);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(
        expect.any(WorkerStorageTypeEntity),
      );
      expect(result).toEqual(mockWorkerStorageType);
    });

    it('should throw NotFoundError if worker storage type not found', async () => {
      const dto: UpdateWorkerStorageTypeDto = {
        name: 'Updated Storage Type',
        persistent: false,
        attachable: false,
        shared: false,
      };

      mockWorkerStorageTypeRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateWorkerStorageType(999999, dto),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteWorkerStorageType', () => {
    it('should delete a worker storage type', async () => {
      mockWorkerStorageTypeRepository.delete.mockResolvedValue(undefined);

      await service.deleteWorkerStorageType(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});

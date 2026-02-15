import { Test, TestingModule } from '@nestjs/testing';
import { WorkerImageService } from './worker-image.service';
import {
  WorkerImageRepository,
  WORKER_IMAGE_REPOSITORY_SYMBOL,
} from '../repositories/worker-image.repository';
import { WorkerImageEntity } from '../entities/worker-image.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerImageDto } from '@/hive/presentation/dtos/create-worker-image.dto';
import { UpdateWorkerImageDto } from '@/hive/presentation/dtos/update-worker-image.dto';

describe('WorkerImageService', () => {
  let service: WorkerImageService;
  let repository: WorkerImageRepository;

  const mockWorkerImage: WorkerImageEntity = new WorkerImageEntity(
    'Test Image',
    'Linux',
    'Debian',
    'https://example.com/image.iso',
    'x86_64',
    'KVM',
    {
      id: 1,
      description: 'Test image description',
      osVersion: '11.0',
      workerStorageTypeId: 1,
    },
  );

  const mockWorkerImageRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerImageService,
        {
          provide: WORKER_IMAGE_REPOSITORY_SYMBOL,
          useValue: mockWorkerImageRepository,
        },
      ],
    }).compile();

    service = module.get<WorkerImageService>(WorkerImageService);
    repository = module.get<WorkerImageRepository>(
      WORKER_IMAGE_REPOSITORY_SYMBOL,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a worker image by id', async () => {
      mockWorkerImageRepository.findById.mockResolvedValue(mockWorkerImage);

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWorkerImage);
    });

    it('should throw NotFoundError if worker image not found', async () => {
      mockWorkerImageRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a worker image successfully', async () => {
      const dto: CreateWorkerImageDto = {
        name: 'New Image',
        osType: 'Linux',
        osFamily: 'Ubuntu',
        imageUrl: 'https://example.com/new-image.iso',
        architecture: 'x86_64',
        virtualizationType: 'KVM',
        description: 'New image description',
        osVersion: '22.04',
        workerStorageTypeId: 2,
      };

      mockWorkerImageRepository.create.mockResolvedValue(mockWorkerImage);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.any(WorkerImageEntity),
      );
      expect(result).toEqual(mockWorkerImage);
    });

    it('should create a worker image with minimal fields', async () => {
      const dto: CreateWorkerImageDto = {
        name: 'Minimal Image',
        osType: 'Linux',
        osFamily: 'Alpine',
        imageUrl: 'https://example.com/minimal.iso',
        architecture: 'arm64',
        virtualizationType: 'QEMU',
      };

      mockWorkerImageRepository.create.mockResolvedValue(mockWorkerImage);

      await service.create(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(WorkerImageEntity);
    });
  });

  describe('update', () => {
    it('should update a worker image successfully', async () => {
      const dto: UpdateWorkerImageDto = {
        name: 'Updated Image',
        osType: 'Linux',
        osFamily: 'Ubuntu',
        imageUrl: 'https://example.com/updated-image.iso',
        architecture: 'x86_64',
        virtualizationType: 'KVM',
        description: 'Updated image description',
        osVersion: '12.0',
        workerStorageTypeId: 2,
      };

      mockWorkerImageRepository.findById.mockResolvedValue(mockWorkerImage);
      mockWorkerImageRepository.update.mockResolvedValue(mockWorkerImage);

      const result = await service.update(1, dto);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(
        expect.any(WorkerImageEntity),
      );
      expect(result).toEqual(mockWorkerImage);
    });

    it('should throw NotFoundError if worker image not found', async () => {
      const dto: UpdateWorkerImageDto = {
        name: 'Updated Image',
        osType: 'Linux',
        osFamily: 'Ubuntu',
        imageUrl: 'https://example.com/updated-image.iso',
        architecture: 'x86_64',
        virtualizationType: 'KVM',
        description: 'Updated image description',
        osVersion: '12.0',
        workerStorageTypeId: 2,
      };

      mockWorkerImageRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete a worker image', async () => {
      mockWorkerImageRepository.delete.mockResolvedValue(undefined);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});

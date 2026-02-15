import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFamilyService } from './worker-family.service';
import {
  WorkerFamilyRepository,
  WORKER_FAMILY_REPOSITORY_SYMBOL,
} from '../repositories/worker-family.repository';
import { WorkerFamilyEntity } from '../entities/worker-family.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerFamilyDto } from '@/hive/presentation/dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '@/hive/presentation/dtos/update-worker-family.dto';

describe('WorkerFamilyService', () => {
  let service: WorkerFamilyService;
  let repository: WorkerFamilyRepository;

  const mockWorkerFamily: WorkerFamilyEntity = new WorkerFamilyEntity(
    'Test Family',
    {
      id: 1,
      description: 'Test family description',
    },
  );

  const mockWorkerFamilyRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerFamilyService,
        {
          provide: WORKER_FAMILY_REPOSITORY_SYMBOL,
          useValue: mockWorkerFamilyRepository,
        },
      ],
    }).compile();

    service = module.get<WorkerFamilyService>(WorkerFamilyService);
    repository = module.get<WorkerFamilyRepository>(
      WORKER_FAMILY_REPOSITORY_SYMBOL,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a worker family by id', async () => {
      mockWorkerFamilyRepository.findById.mockResolvedValue(mockWorkerFamily);

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWorkerFamily);
    });

    it('should throw NotFoundError if worker family not found', async () => {
      mockWorkerFamilyRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a worker family successfully', async () => {
      const dto: CreateWorkerFamilyDto = {
        name: 'New Family',
        description: 'New family description',
      };

      mockWorkerFamilyRepository.create.mockResolvedValue(mockWorkerFamily);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.any(WorkerFamilyEntity),
      );
      expect(result).toEqual(mockWorkerFamily);
    });

    it('should create a worker family without description', async () => {
      const dto: CreateWorkerFamilyDto = {
        name: 'New Family',
      };

      mockWorkerFamilyRepository.create.mockResolvedValue(mockWorkerFamily);

      await service.create(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(WorkerFamilyEntity);
      expect(createdEntity.name).toBe('New Family');
    });
  });

  describe('update', () => {
    it('should update a worker family successfully', async () => {
      const dto: UpdateWorkerFamilyDto = {
        name: 'Updated Family',
        description: 'Updated description',
      };

      mockWorkerFamilyRepository.findById.mockResolvedValue(mockWorkerFamily);
      mockWorkerFamilyRepository.update.mockResolvedValue(mockWorkerFamily);

      const result = await service.update(1, dto);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(
        expect.any(WorkerFamilyEntity),
      );
      expect(result).toEqual(mockWorkerFamily);
    });

    it('should throw NotFoundError if worker family not found', async () => {
      const dto: UpdateWorkerFamilyDto = {
        name: 'Updated Family',
      };

      mockWorkerFamilyRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete a worker family', async () => {
      mockWorkerFamilyRepository.delete.mockResolvedValue(undefined);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});

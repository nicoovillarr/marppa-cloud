import { Test, TestingModule } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { WorkerRepository, WORKER_REPOSITORY_SYMBOL } from '../repositories/worker.repository';
import { WorkerEntity } from '../entities/worker.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerDto } from '@/hive/presentation/dtos/create-worker.dto';
import { UpdateWorkerDto } from '@/hive/presentation/dtos/update-worker.dto';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { MacAddressService } from './mac-address.service';

describe('WorkerService', () => {
  let service: WorkerService;
  let repository: WorkerRepository;

  const mockWorker: WorkerEntity = new WorkerEntity(
    'Test Worker',
    ResourceStatus.INACTIVE,
    '00:11:22:33:44:55',
    'u-000001',
    1,
    1,
    'c-000001',
    {
      id: 'w-000001',
    }
  );

  const mockWorkerRepository = {
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: WORKER_REPOSITORY_SYMBOL,
          useValue: mockWorkerRepository,
        },

        MacAddressService,
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
    repository = module.get<WorkerRepository>(WORKER_REPOSITORY_SYMBOL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a worker by id', async () => {
      mockWorkerRepository.findById.mockResolvedValue(mockWorker);

      const result = await service.findById('w-000001');

      expect(repository.findById).toHaveBeenCalledWith('w-000001');
      expect(result).toEqual(mockWorker);
    });

    it('should throw NotFoundError if worker not found', async () => {
      mockWorkerRepository.findById.mockResolvedValue(null);

      await expect(service.findById('w-999999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByOwnerId', () => {
    it('should return workers by owner id', async () => {
      mockWorkerRepository.findByOwnerId.mockResolvedValue([mockWorker]);

      const result = await service.findByOwnerId('c-000001');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([mockWorker]);
    });

    it('should return empty array if no workers found', async () => {
      mockWorkerRepository.findByOwnerId.mockResolvedValue([]);

      const result = await service.findByOwnerId('c-999999');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-999999');
      expect(result).toEqual([]);
    });
  });

  describe('createWorker', () => {
    it('should create a worker successfully', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
      };

      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000001',
        companyId: 'c-000001',
      } as any);

      mockWorkerRepository.create.mockResolvedValue(mockWorker);

      const result = await service.createWorker(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.any(WorkerEntity));
      expect(result).toEqual(mockWorker);
    });

    it('should use provided ownerId if specified', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        ownerId: 'c-custom',
      };

      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000001',
        companyId: 'c-000001',
      } as any);

      mockWorkerRepository.create.mockResolvedValue(mockWorker);

      await service.createWorker(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity.ownerId).toBe('c-custom');
    });
  });

  describe('updateWorker', () => {
    it('should update a worker successfully', async () => {
      const dto: UpdateWorkerDto = {
        name: 'Updated Worker'
      };

      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000002',
        companyId: 'c-000001',
      } as any);

      mockWorkerRepository.findById.mockResolvedValue(mockWorker);
      mockWorkerRepository.update.mockResolvedValue(mockWorker);

      const result = await service.updateWorker('w-000001', dto);

      expect(repository.findById).toHaveBeenCalledWith('w-000001');
      expect(repository.update).toHaveBeenCalledWith(expect.any(WorkerEntity));
      expect(result).toEqual(mockWorker);
    });

    it('should throw NotFoundError if worker not found', async () => {
      const dto: UpdateWorkerDto = {
        name: 'Updated Worker',
      };

      mockWorkerRepository.findById.mockResolvedValue(null);

      await expect(service.updateWorker('w-999999', dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteWorker', () => {
    it('should delete a worker', async () => {
      mockWorkerRepository.findById.mockResolvedValue(mockWorker);
      mockWorkerRepository.update.mockResolvedValue(mockWorker);

      await service.deleteWorker('w-000001');

      expect(repository.findById).toHaveBeenCalledWith('w-000001');
      expect(repository.update).toHaveBeenCalledWith(expect.any(WorkerEntity));
    });
  });
});

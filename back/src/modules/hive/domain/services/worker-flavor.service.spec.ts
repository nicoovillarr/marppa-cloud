import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFlavorService } from './worker-flavor.service';
import { WorkerFlavorRepository, WORKER_FLAVOR_REPOSITORY_SYMBOL } from '../repositories/worker-flavor.repository';
import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerFlavorDto } from '@/hive/presentation/dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '@/hive/presentation/dtos/update-worker-flavor.dto';

describe('WorkerFlavorService', () => {
  let service: WorkerFlavorService;
  let repository: WorkerFlavorRepository;

  const mockWorkerFlavor: WorkerFlavorEntity = new WorkerFlavorEntity(
    'Test Flavor',
    4,
    8192,
    100,
    1,
    {
      id: 1,
    }
  );

  const mockWorkerFlavorRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerFlavorService,
        {
          provide: WORKER_FLAVOR_REPOSITORY_SYMBOL,
          useValue: mockWorkerFlavorRepository,
        },
      ],
    }).compile();

    service = module.get<WorkerFlavorService>(WorkerFlavorService);
    repository = module.get<WorkerFlavorRepository>(WORKER_FLAVOR_REPOSITORY_SYMBOL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a worker flavor by id', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(mockWorkerFlavor);

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWorkerFlavor);
    });

    it('should throw NotFoundError if worker flavor not found', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createWorkerFlavor', () => {
    it('should create a worker flavor successfully', async () => {
      const dto: CreateWorkerFlavorDto = {
        name: 'New Flavor',
        cpuCores: 8,
        ramMB: 16384,
        diskGB: 200,
        familyId: 1,
      };

      mockWorkerFlavorRepository.create.mockResolvedValue(mockWorkerFlavor);

      const result = await service.createWorkerFlavor(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.any(WorkerFlavorEntity));
      expect(result).toEqual(mockWorkerFlavor);
    });
  });

  describe('updateWorkerFlavor', () => {
    it('should update a worker flavor successfully', async () => {
      const dto: UpdateWorkerFlavorDto = {
        name: 'Updated Flavor',
        cpuCores: 16,
        ramMB: 32768,
        diskGB: 200,
        familyId: 1,
      };

      mockWorkerFlavorRepository.findById.mockResolvedValue(mockWorkerFlavor);
      mockWorkerFlavorRepository.update.mockResolvedValue(mockWorkerFlavor);

      const result = await service.updateWorkerFlavor(1, dto);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(expect.any(WorkerFlavorEntity));
      expect(result).toEqual(mockWorkerFlavor);
    });

    it('should throw NotFoundError if worker flavor not found', async () => {
      const dto: UpdateWorkerFlavorDto = {
        name: 'Updated Flavor',
        cpuCores: 16,
        ramMB: 32768,
        diskGB: 200,
        familyId: 1,
      };

      mockWorkerFlavorRepository.findById.mockResolvedValue(null);

      await expect(service.updateWorkerFlavor(999, dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteWorkerFlavor', () => {
    it('should delete a worker flavor', async () => {
      mockWorkerFlavorRepository.delete.mockResolvedValue(undefined);

      await service.deleteWorkerFlavor(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFlavorService } from './worker-flavor.service';
import {
  WorkerFlavorRepository,
  WORKER_FLAVOR_REPOSITORY_SYMBOL,
} from '../repositories/worker-flavor.repository';
import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerFlavorDto } from '@/hive/presentation/dtos/create-worker-flavor.dto';
import { UpdateWorkerFlavorDto } from '@/hive/presentation/dtos/update-worker-flavor.dto';
import { WorkerFlavorAlreadyExistsError } from '../errors/worker-flavor-already-exists.error';
import { WorkerFlavorDeprecatedError } from '../errors/worker-flavor-deprecated.error';

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
    },
  );

  const mockWorkerFlavorRepository = {
    findById: jest.fn(),
    findByIdWithFamily: jest.fn(),
    findAll: jest.fn(),
    findMaxVersion: jest.fn(),
    create: jest.fn(),
    deprecate: jest.fn(),
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
    repository = module.get<WorkerFlavorRepository>(
      WORKER_FLAVOR_REPOSITORY_SYMBOL,
    );
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

  describe('findAll', () => {
    it('should hide deprecated flavors by default', async () => {
      mockWorkerFlavorRepository.findAll.mockResolvedValue([mockWorkerFlavor]);

      await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('createWorkerFlavor', () => {
    const dto: CreateWorkerFlavorDto = {
      name: 'New Flavor',
      cpuCores: 8,
      ramMB: 16384,
      diskGB: 200,
      familyId: 1,
    };

    it('should create a worker flavor successfully', async () => {
      mockWorkerFlavorRepository.findMaxVersion.mockResolvedValue(0);
      mockWorkerFlavorRepository.create.mockResolvedValue(mockWorkerFlavor);

      const result = await service.createWorkerFlavor(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.any(WorkerFlavorEntity),
      );
      expect(result).toEqual(mockWorkerFlavor);
    });

    it('should refuse a name already used in the family', async () => {
      mockWorkerFlavorRepository.findMaxVersion.mockResolvedValue(2);

      await expect(service.createWorkerFlavor(dto)).rejects.toThrow(
        WorkerFlavorAlreadyExistsError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('reviseWorkerFlavor', () => {
    const dto: UpdateWorkerFlavorDto = {
      cpuCores: 16,
      ramMB: 32768,
      diskGB: 200,
    };

    it('should add a new version and deprecate the current one', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(mockWorkerFlavor);
      mockWorkerFlavorRepository.findMaxVersion.mockResolvedValue(3);
      mockWorkerFlavorRepository.create.mockImplementation(
        (entity: WorkerFlavorEntity) => Promise.resolve(entity),
      );

      const result = await service.reviseWorkerFlavor(1, dto);

      expect(result.name).toBe(mockWorkerFlavor.name);
      expect(result.version).toBe(4);
      expect(result.cpuCores).toBe(16);
      expect(repository.deprecate).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should keep the current price when the revision omits it', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(
        new WorkerFlavorEntity('Priced', 2, 4096, 40, 1, {
          id: 5,
          pricePerHourCents: 120,
        }),
      );
      mockWorkerFlavorRepository.findMaxVersion.mockResolvedValue(1);
      mockWorkerFlavorRepository.create.mockImplementation(
        (entity: WorkerFlavorEntity) => Promise.resolve(entity),
      );

      const result = await service.reviseWorkerFlavor(5, dto);

      expect(result.pricePerHourCents).toBe(120);
    });

    it('should refuse to revise a deprecated flavor', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(
        new WorkerFlavorEntity('Old', 2, 4096, 40, 1, {
          id: 6,
          deprecatedAt: new Date(),
        }),
      );

      await expect(service.reviseWorkerFlavor(6, dto)).rejects.toThrow(
        WorkerFlavorDeprecatedError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if worker flavor not found', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(null);

      await expect(service.reviseWorkerFlavor(999, dto)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('deprecateWorkerFlavor', () => {
    it('should deprecate a worker flavor', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(mockWorkerFlavor);

      await service.deprecateWorkerFlavor(1);

      expect(repository.deprecate).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should leave an already deprecated flavor untouched', async () => {
      mockWorkerFlavorRepository.findById.mockResolvedValue(
        new WorkerFlavorEntity('Old', 2, 4096, 40, 1, {
          id: 7,
          deprecatedAt: new Date(),
        }),
      );

      await service.deprecateWorkerFlavor(7);

      expect(repository.deprecate).not.toHaveBeenCalled();
    });
  });
});

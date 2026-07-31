import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { WorkerWithRelationsModel } from '../models/worker-with-relations.model';
import {
  WorkerRepository,
  WORKER_REPOSITORY_SYMBOL,
} from '../repositories/worker.repository';
import { WorkerEntity } from '../entities/worker.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { CreateWorkerDto } from '@/hive/presentation/dtos/create-worker.dto';
import { UpdateWorkerDto } from '@/hive/presentation/dtos/update-worker.dto';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { MacAddressService } from './mac-address.service';
import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';
import { NodeEntity } from '@/mesh/domain/entities/node.entity';
import { WorkerFamilyEntity } from '../entities/worker-family.entity';
import { WorkerImageEntity } from '../entities/worker-image.entity';
import { WorkerFlavorWithFamilyModel } from '../models/worker-flavor-with-family.model';
import { WorkerFlavorService } from './worker-flavor.service';
import { WorkerImageService } from './worker-image.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { WorkerFlavorDeprecatedError } from '../errors/worker-flavor-deprecated.error';
import { WorkerArchitectureMismatchError } from '../errors/worker-architecture-mismatch.error';
import { HostCapacityExceededError } from '@/shared/domain/errors/host-capacity-exceeded.error';

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
    2,
    4096,
    50,
    {
      id: 'w-000001',
    },
  );

  const mockFlavor = new WorkerFlavorEntity(
    'Test Flavor',
    2,
    4096,
    1,
    { id: 1 },
  );

  const mockFamily = new WorkerFamilyEntity('test', 'amd64', { id: 1 });

  const mockImage = new WorkerImageEntity(
    'ubuntu-24.04',
    'linux',
    'ubuntu',
    'https://images.example/noble.img',
    'amd64',
    'qcow2',
    { id: 1 },
  );

  const mockNode = new NodeEntity(
    '10.0.0.1',
    ResourceStatus.ACTIVE,
    'z-000001',
    'u-000001',
    {
      id: 'n-000001'
    }
  );

  const mockWorkerWithRelations = new WorkerWithRelationsModel(
    mockWorker,
    mockFlavor,
    mockNode
  )

  const mockWorkerRepository = {
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findByOwnerIdWithRelations: jest.fn(),
    sumProvisionedResources: jest.fn(),
    sumRunningResources: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockWorkerFlavorService = {
    findByIdWithFamily: jest.fn(),
  };

  const mockWorkerImageService = {
    findById: jest.fn(),
  };

  const mockHostCapacityService = {
    assertFitsOnCreate: jest.fn(),
    assertFitsOnStart: jest.fn(),
  };


  const mockCompanyHierarchyService = {
    selfAndAncestors: jest.fn(async (companyId: string) => [companyId]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CompanyHierarchyService,
          useValue: mockCompanyHierarchyService,
        },
        WorkerService,
        {
          provide: WORKER_REPOSITORY_SYMBOL,
          useValue: mockWorkerRepository,
        },
        {
          provide: WorkerFlavorService,
          useValue: mockWorkerFlavorService,
        },
        {
          provide: WorkerImageService,
          useValue: mockWorkerImageService,
        },
        {
          provide: HostCapacityService,
          useValue: mockHostCapacityService,
        },

        MacAddressService,
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
    repository = module.get<WorkerRepository>(WORKER_REPOSITORY_SYMBOL);

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);

    mockWorkerFlavorService.findByIdWithFamily.mockResolvedValue(
      new WorkerFlavorWithFamilyModel(mockFlavor, mockFamily),
    );
    mockWorkerImageService.findById.mockResolvedValue(mockImage);
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

  describe('findByIdWithRelations', () => {
    it('should return a worker with relations by id', async () => {
      mockWorkerRepository.findByIdWithRelations.mockResolvedValue(mockWorkerWithRelations);

      const result = await service.findByIdWithRelations('w-000001');

      expect(repository.findByIdWithRelations).toHaveBeenCalledWith('w-000001');
      expect(result).toEqual(mockWorkerWithRelations);
    });

    it('should throw NotFoundError if worker not found', async () => {
      mockWorkerRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findByIdWithRelations('w-999999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByOwnerId', () => {
    it('should return workers by owner id', async () => {
      mockWorkerRepository.findByOwnerId.mockResolvedValue([mockWorkerWithRelations]);

      const result = await service.findByOwnerId('c-000001');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([mockWorkerWithRelations]);
    });

    it('should return empty array if no workers found', async () => {
      mockWorkerRepository.findByOwnerId.mockResolvedValue([]);

      const result = await service.findByOwnerId('c-000001');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedError when ownerId belongs to another company', async () => {
      // findByOwnerId is async: it rejects, it never throws synchronously.
      await expect(service.findByOwnerId('c-999999')).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe('createWorker', () => {
    it('should create a worker successfully', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
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

    it('should reject an ownerId of another company', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        ownerId: 'c-custom',
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
      };

      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000001',
        companyId: 'c-000001',
      } as any);

      await expect(service.createWorker(dto)).rejects.toThrow(
        UnauthorizedError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should accept an ownerId matching the caller company', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        ownerId: 'c-000001',
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
      };

      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000001',
        companyId: 'c-000001',
      } as any);

      mockWorkerRepository.create.mockResolvedValue(mockWorker);

      await service.createWorker(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity.ownerId).toBe('c-000001');
    });

    it('should snapshot the flavor specs onto the worker', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
      };

      mockWorkerRepository.create.mockResolvedValue(mockWorker);

      await service.createWorker(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity.cpuCores).toBe(mockFlavor.cpuCores);
      expect(createdEntity.ramMB).toBe(mockFlavor.ramMB);
      expect(createdEntity.diskGB).toBe(20);
    });

    it('should reject a deprecated flavor', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
      };

      mockWorkerFlavorService.findByIdWithFamily.mockResolvedValue(
        new WorkerFlavorWithFamilyModel(
          new WorkerFlavorEntity('Old Flavor', 2, 4096, 1, {
            id: 1,
            deprecatedAt: new Date(),
          }),
          mockFamily,
        ),
      );

      await expect(service.createWorker(dto)).rejects.toThrow(
        WorkerFlavorDeprecatedError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject an image whose architecture differs from the family', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
      };

      mockWorkerImageService.findById.mockResolvedValue(
        new WorkerImageEntity(
          'ubuntu-24.04-arm',
          'linux',
          'ubuntu',
          'https://images.example/noble-arm64.img',
          'arm64',
          'qcow2',
          { id: 2 },
        ),
      );

      await expect(service.createWorker(dto)).rejects.toThrow(
        WorkerArchitectureMismatchError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject a flavor from another company private family', async () => {
      const dto: CreateWorkerDto = {
        name: 'New Worker',
        imageId: 1,
        flavorId: 1,
        publicSSH: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@test',
      };

      mockWorkerFlavorService.findByIdWithFamily.mockResolvedValue(
        new WorkerFlavorWithFamilyModel(
          mockFlavor,
          new WorkerFamilyEntity('private', 'amd64', {
            id: 2,
            ownerId: 'c-999999',
          }),
        ),
      );

      await expect(service.createWorker(dto)).rejects.toThrow(NotFoundError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('startWorker', () => {
    it('should refuse to start when the host has no room left', async () => {
      mockWorkerRepository.findById.mockResolvedValue(mockWorker);
      mockHostCapacityService.assertFitsOnStart.mockRejectedValue(
        new HostCapacityExceededError('memory', 4096, 1024, 'MB'),
      );

      await expect(service.startWorker('w-000001')).rejects.toThrow(
        HostCapacityExceededError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateWorker', () => {
    it('should update a worker successfully', async () => {
      const dto: UpdateWorkerDto = {
        name: 'Updated Worker',
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

      await expect(service.updateWorker('w-999999', dto)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('deleteWorker', () => {
    it('should delete a worker', async () => {
      mockWorkerRepository.findById.mockResolvedValue(mockWorker);
      mockWorkerRepository.update.mockResolvedValue(mockWorker);

      await service.deleteWorker('w-000001');

      expect(repository.findById).toHaveBeenCalledWith('w-000001');
      // Entry status per the shared state machine: the WORKER_DELETE processor
      // validates QUEUED and applies DELETING itself while it works.
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ResourceStatus.QUEUED,
        }) as WorkerEntity,
      );
    });
  });
});

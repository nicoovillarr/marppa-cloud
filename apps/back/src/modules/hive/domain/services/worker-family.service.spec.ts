import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFamilyService } from './worker-family.service';
import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';
import {
  WorkerFamilyRepository,
  WORKER_FAMILY_REPOSITORY_SYMBOL,
} from '../repositories/worker-family.repository';
import { WorkerFamilyEntity } from '../entities/worker-family.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { CreateWorkerFamilyDto } from '@/hive/presentation/dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '@/hive/presentation/dtos/update-worker-family.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';

describe('WorkerFamilyService', () => {
  let service: WorkerFamilyService;
  let repository: WorkerFamilyRepository;

  const mockWorkerFamily: WorkerFamilyEntity = new WorkerFamilyEntity(
    'Test Family',
    'amd64',
    {
      id: 1,
      description: 'Test family description',
    },
  );

  const mockWorkerFamilyRepository = {
    findAvailableFor: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deprecate: jest.fn(),
    restore: jest.fn(),
  };

  const mockPlatformAdminService = {
    isPlatformAdmin: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerFamilyService,
        {
          provide: WORKER_FAMILY_REPOSITORY_SYMBOL,
          useValue: mockWorkerFamilyRepository,
        },
        {
          provide: PlatformAdminService,
          useValue: mockPlatformAdminService,
        },
      ],
    }).compile();

    service = module.get<WorkerFamilyService>(WorkerFamilyService);
    repository = module.get<WorkerFamilyRepository>(
      WORKER_FAMILY_REPOSITORY_SYMBOL,
    );

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should only ask for families visible to the caller company', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockWorkerFamilyRepository.findAvailableFor.mockResolvedValue([]);

      await service.findAll();

      expect(repository.findAvailableFor).toHaveBeenCalledWith(
        'c-000001',
        false,
      );
    });

    it('should let a platform admin see every family, deprecated included', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(true);
      mockWorkerFamilyRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(repository.findAll).toHaveBeenCalledWith(true);
      expect(repository.findAvailableFor).not.toHaveBeenCalled();
    });
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

    it('should hide a family owned by another company', async () => {
      mockWorkerFamilyRepository.findById.mockResolvedValue(
        new WorkerFamilyEntity('Private', 'amd64', {
          id: 2,
          ownerId: 'c-999999',
        }),
      );

      await expect(service.findById(2)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a worker family successfully', async () => {
      const dto: CreateWorkerFamilyDto = {
        name: 'New Family',
        architecture: 'amd64',
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
        architecture: 'amd64',
      };

      mockWorkerFamilyRepository.create.mockResolvedValue(mockWorkerFamily);

      await service.create(dto);

      const createdEntity = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(WorkerFamilyEntity);
      expect(createdEntity.name).toBe('New Family');
    });

    it('should reject an ownerId of another company', async () => {
      const dto: CreateWorkerFamilyDto = {
        name: 'New Family',
        architecture: 'amd64',
        ownerId: 'c-999999',
      };

      await expect(service.create(dto)).rejects.toThrow(UnauthorizedError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a worker family successfully', async () => {
      const dto: UpdateWorkerFamilyDto = {
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
        description: 'Updated description',
      };

      mockWorkerFamilyRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deprecate', () => {
    it('should deprecate a worker family', async () => {
      mockWorkerFamilyRepository.findById.mockResolvedValue(mockWorkerFamily);
      mockWorkerFamilyRepository.deprecate.mockResolvedValue(undefined);

      await service.deprecate(1);

      expect(repository.deprecate).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should leave an already deprecated family untouched', async () => {
      mockWorkerFamilyRepository.findById.mockResolvedValue(
        new WorkerFamilyEntity('Old', 'amd64', {
          id: 3,
          deprecatedAt: new Date(),
        }),
      );

      await service.deprecate(3);

      expect(repository.deprecate).not.toHaveBeenCalled();
    });
  });
});

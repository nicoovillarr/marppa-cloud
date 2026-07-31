import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
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
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';
import { WorkerImageInUseError } from '../errors/worker-image-in-use.error';
import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';
import { sessionStorage } from '@/auth/infrastructure/als/session.context';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { UserRole } from '@marppa-cloud/db';

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
    countWorkers: jest.fn(),
    findAvailableFor: jest.fn(),
    findAll: jest.fn(),
  };

  const mockPlatformAdminService = {
    isPlatformAdmin: jest.fn().mockResolvedValue(false),
  };

  const asCompany = <T>(companyId: string, run: () => Promise<T>): Promise<T> =>
    sessionStorage.run(
      {
        user: new JwtEntity(
          'u-1',
          'u@marppa.com',
          companyId,
          'access',
          UserRole.OWNER,
        ),
      },
      run,
    );


  const mockCompanyHierarchyService = {
    selfAndAncestors: jest.fn(async (companyId: string) => [companyId]),
    selfAndDescendants: jest.fn(async (companyId: string) => [companyId]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CompanyHierarchyService,
          useValue: mockCompanyHierarchyService,
        },
        WorkerImageService,
        {
          provide: WORKER_IMAGE_REPOSITORY_SYMBOL,
          useValue: mockWorkerImageRepository,
        },
        {
          provide: PlatformAdminService,
          useValue: mockPlatformAdminService,
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
    it('should delete a worker image no worker boots from', async () => {
      mockWorkerImageRepository.findById.mockResolvedValue(mockWorkerImage);
      mockWorkerImageRepository.countWorkers.mockResolvedValue(0);
      mockWorkerImageRepository.delete.mockResolvedValue(undefined);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should refuse to delete an image workers still boot from', async () => {
      mockWorkerImageRepository.findById.mockResolvedValue(mockWorkerImage);
      mockWorkerImageRepository.countWorkers.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toThrow(WorkerImageInUseError);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw when the image does not exist', async () => {
      mockWorkerImageRepository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('image ownership', () => {
    const privateImage = new WorkerImageEntity(
      'acme-debian',
      'Linux',
      'Debian',
      'https://example.com/acme.qcow2',
      'x86_64',
      'KVM',
      { id: 7, ownerId: 'c-acme' },
    );

    it('hides another company private image behind a 404', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockWorkerImageRepository.findById.mockResolvedValue(privateImage);

      await expect(
        asCompany('c-other', () => service.findById(7)),
      ).rejects.toThrow(NotFoundError);
    });

    it('lets the owning company resolve it', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockWorkerImageRepository.findById.mockResolvedValue(privateImage);

      const result = await asCompany('c-acme', () => service.findById(7));

      expect(result.ownerId).toBe('c-acme');
    });

    it('lets a platform admin resolve any image', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(true);
      mockWorkerImageRepository.findById.mockResolvedValue(privateImage);

      const result = await asCompany('c-other', () => service.findById(7));

      expect(result.ownerId).toBe('c-acme');
    });

    it('scopes the listing to the caller company', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockWorkerImageRepository.findAvailableFor.mockResolvedValue([]);

      await asCompany('c-acme', () => service.findAll());

      expect(repository.findAvailableFor).toHaveBeenCalledWith(['c-acme']);
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it('refuses to scope an image to another company', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);

      await expect(
        asCompany('c-acme', () =>
          service.create({
            name: 'x',
            osType: 'Linux',
            osFamily: 'Debian',
            imageUrl: 'https://example.com/x.qcow2',
            architecture: 'x86_64',
            virtualizationType: 'KVM',
            ownerId: 'c-victim',
          }),
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('inheritance down the company tree', () => {
    const parentImage = new WorkerImageEntity(
      'parent-debian',
      'Linux',
      'Debian',
      'https://example.com/parent.qcow2',
      'x86_64',
      'KVM',
      { id: 9, ownerId: 'c-parent' },
    );

    it('lets a child company resolve its parent image', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockCompanyHierarchyService.selfAndAncestors.mockResolvedValue([
        'c-child',
        'c-parent',
      ]);
      mockWorkerImageRepository.findById.mockResolvedValue(parentImage);

      const result = await asCompany('c-child', () => service.findById(9));

      expect(result.ownerId).toBe('c-parent');
    });

    it('does not let a parent resolve its child image', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockCompanyHierarchyService.selfAndAncestors.mockResolvedValue([
        'c-parent',
      ]);
      mockWorkerImageRepository.findById.mockResolvedValue(
        new WorkerImageEntity(
          'child-debian',
          'Linux',
          'Debian',
          'https://example.com/child.qcow2',
          'x86_64',
          'KVM',
          { id: 10, ownerId: 'c-child' },
        ),
      );

      await expect(
        asCompany('c-parent', () => service.findById(10)),
      ).rejects.toThrow(NotFoundError);
    });

    it('asks the catalog for the whole ancestor chain', async () => {
      mockPlatformAdminService.isPlatformAdmin.mockResolvedValue(false);
      mockCompanyHierarchyService.selfAndAncestors.mockResolvedValue([
        'c-child',
        'c-parent',
        'c-root',
      ]);
      mockWorkerImageRepository.findAvailableFor.mockResolvedValue([]);

      await asCompany('c-child', () => service.findAll());

      expect(repository.findAvailableFor).toHaveBeenCalledWith([
        'c-child',
        'c-parent',
        'c-root',
      ]);
    });
  });
});

import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AtomService } from './atom.service';
import { AtomSizeService } from './atom-size.service';
import { AtomImageService } from './atom-image.service';
import {
  ATOM_REPOSITORY_SYMBOL,
  AtomRepository,
} from '../repositories/atom.repository';
import { AtomEntity } from '../entities/atom.entity';
import { AtomImageEntity } from '../entities/atom-image.entity';
import { AtomSizeEntity } from '../entities/atom-size.entity';
import { AtomSizeDeprecatedError } from '../errors/atom-size-deprecated.error';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { HostCapacityExceededError } from '@/shared/domain/errors/host-capacity-exceeded.error';
import { CompanyService } from '@/company/domain/services/company.service';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import * as sessionContext from '@/auth/infrastructure/als/session.context';

describe('AtomService', () => {
  let service: AtomService;
  let repository: AtomRepository;

  const mockSize = new AtomSizeEntity('small', 0.5, 512, { id: 2 });

  const mockImage = new AtomImageEntity(
    'redis-7',
    'docker.io',
    'library/redis',
    '7-alpine',
    'amd64',
    2,
    { id: 1 },
  );

  const mockAtom = new AtomEntity(
    'cache',
    ResourceStatus.INACTIVE,
    'u-000001',
    1,
    '7-alpine',
    'c-000001',
    2,
    0.5,
    512,
    { id: 'a-000001' },
  );

  const mockAtomRepository = {
    findById: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockAtomImageService = { findById: jest.fn() };
  const mockAtomSizeService = { findById: jest.fn() };
  const mockHostCapacityService = {
    assertFitsOnCreate: jest.fn(),
    assertFitsOnStart: jest.fn(),
  };
  const mockCompanyService = { findById: jest.fn() };


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
        AtomService,
        { provide: ATOM_REPOSITORY_SYMBOL, useValue: mockAtomRepository },
        { provide: AtomImageService, useValue: mockAtomImageService },
        { provide: AtomSizeService, useValue: mockAtomSizeService },
        { provide: HostCapacityService, useValue: mockHostCapacityService },
        { provide: CompanyService, useValue: mockCompanyService },
      ],
    }).compile();

    service = module.get<AtomService>(AtomService);
    repository = module.get<AtomRepository>(ATOM_REPOSITORY_SYMBOL);

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
    } as any);

    mockAtomImageService.findById.mockResolvedValue(mockImage);
    mockAtomSizeService.findById.mockResolvedValue(mockSize);
    mockAtomRepository.create.mockResolvedValue(mockAtom);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAtom', () => {
    const dto = { name: 'cache', imageId: 1 };

    it("should fall back to the image's default size", async () => {
      await service.createAtom(dto);

      expect(mockAtomSizeService.findById).toHaveBeenCalledWith(
        mockImage.defaultSizeId,
      );
    });

    it('should use an explicitly requested size', async () => {
      await service.createAtom({ ...dto, sizeId: 7 });

      expect(mockAtomSizeService.findById).toHaveBeenCalledWith(7);
    });

    it('should snapshot the size onto the atom', async () => {
      await service.createAtom(dto);

      const created = (repository.create as jest.Mock).mock.calls[0][0];
      expect(created.sizeId).toBe(mockSize.id);
      expect(created.cpuCores).toBe(mockSize.cpuCores);
      expect(created.ramMB).toBe(mockSize.ramMB);
    });

    it("should fall back to the image's default tag", async () => {
      await service.createAtom(dto);

      const created = (repository.create as jest.Mock).mock.calls[0][0];
      expect(created.tag).toBe(mockImage.defaultTag);
    });

    it('should use an explicitly requested tag', async () => {
      await service.createAtom({ ...dto, tag: '7-bookworm' });

      const created = (repository.create as jest.Mock).mock.calls[0][0];
      expect(created.tag).toBe('7-bookworm');
    });

    it('should refuse a deprecated size', async () => {
      mockAtomSizeService.findById.mockResolvedValue(
        new AtomSizeEntity('old', 0.5, 512, {
          id: 9,
          deprecatedAt: new Date(),
        }),
      );

      await expect(service.createAtom(dto)).rejects.toThrow(
        AtomSizeDeprecatedError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should refuse an atom the host cannot hold', async () => {
      mockHostCapacityService.assertFitsOnCreate.mockRejectedValue(
        new HostCapacityExceededError('memory', 512, 128, 'MB'),
      );

      await expect(service.createAtom(dto)).rejects.toThrow(
        HostCapacityExceededError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('startAtom', () => {
    it('should check capacity with the snapshotted size', async () => {
      mockAtomRepository.findById.mockResolvedValue(mockAtom);
      mockAtomRepository.update.mockResolvedValue(mockAtom);

      await service.startAtom('a-000001');

      expect(mockHostCapacityService.assertFitsOnStart).toHaveBeenCalledWith(
        'a-000001',
        { cpuCores: 0.5, ramMB: 512, diskGB: 0 },
      );
    });

    it('should not queue the start when the host is full', async () => {
      mockAtomRepository.findById.mockResolvedValue(mockAtom);
      mockHostCapacityService.assertFitsOnStart.mockRejectedValue(
        new HostCapacityExceededError('memory', 512, 0, 'MB'),
      );

      await expect(service.startAtom('a-000001')).rejects.toThrow(
        HostCapacityExceededError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});

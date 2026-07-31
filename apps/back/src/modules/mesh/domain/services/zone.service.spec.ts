import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ZoneService } from './zone.service';
import {
  ZoneRepository,
  ZONE_REPOSITORY_SYMBOL,
} from '../repositories/zone.repository';
import { ZoneEntity } from '../entities/zone.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreateZoneDto } from '../../presentation/dtos/create-zone.dto';
import { UpdateZoneDto } from '../../presentation/dtos/update-zone.dto';
import { ZoneWithNodesModel } from '../models/zone-with-nodes.model';
import * as SessionContext from '@/auth/infrastructure/als/session.context';

describe('ZoneService', () => {
  let service: ZoneService;
  let repository: ZoneRepository;

  const mockZoneEntity = new ZoneEntity(
    'Test Zone',
    ResourceStatus.ACTIVE,
    '10.0.0.0/16',
    '10.0.0.1',
    'u-000001',
    'c-000001',
    {
      description: 'Test Description',
      id: 'z-000001',
      updatedBy: 'u-000001',
    },
  );

  const mockZoneWithNodesModel: ZoneWithNodesModel = {
    zone: mockZoneEntity,
    nodes: [],
  } as unknown as ZoneWithNodesModel;

  const mockZoneRepository = {
    findById: jest.fn(),
    findByIdWithNodes: jest.fn(),
    findByOwnerIds: jest.fn(),
    findAllActive: jest.fn(),
    findLastZone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };


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
        ZoneService,
        {
          provide: ZONE_REPOSITORY_SYMBOL,
          useValue: mockZoneRepository,
        },
      ],
    }).compile();

    service = module.get<ZoneService>(ZoneService);
    repository = module.get<ZoneRepository>(ZONE_REPOSITORY_SYMBOL);

    jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a zone by id', async () => {
      mockZoneRepository.findById.mockResolvedValue(mockZoneEntity);

      const result = await service.findById('z-000001');

      expect(repository.findById).toHaveBeenCalledWith('z-000001');
      expect(result).toEqual(mockZoneEntity);
    });

    it('should throw NotFoundError if zone not found', async () => {
      mockZoneRepository.findById.mockResolvedValue(null);

      await expect(service.findById('z-999999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByIdWithNodes', () => {
    it('should return a zone with nodes by id', async () => {
      mockZoneRepository.findByIdWithNodes.mockResolvedValue(
        mockZoneWithNodesModel,
      );

      const result = await service.findByIdWithNodes('z-000001');

      expect(repository.findByIdWithNodes).toHaveBeenCalledWith('z-000001');
      expect(result).toEqual(mockZoneWithNodesModel);
    });

    it('should throw NotFoundError if zone not found', async () => {
      mockZoneRepository.findByIdWithNodes.mockResolvedValue(null);

      await expect(service.findByIdWithNodes('z-999999')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('findByOwnerIds', () => {
    it('should return zones by owner id from argument when it matches the session company', async () => {
      mockZoneRepository.findByOwnerIds.mockResolvedValue([mockZoneEntity]);

      const result = await service.findByOwnerId('c-000001');

      expect(repository.findByOwnerIds).toHaveBeenCalledWith(['c-000001']);
      expect(result).toEqual([mockZoneEntity]);
    });

    it('should throw UnauthorizedError when ownerId belongs to another company', async () => {
      await expect(service.findByOwnerId('c-000002')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('should return zones by owner id from session if argument is null', async () => {
      mockZoneRepository.findByOwnerIds.mockResolvedValue([mockZoneEntity]);

      const result = await service.findByOwnerId();

      expect(repository.findByOwnerIds).toHaveBeenCalledWith(['c-000001']);
      expect(result).toEqual([mockZoneEntity]);
    });

    it('should throw UnauthorizedError if no user in session and no ownerId provided', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.findByOwnerId()).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('findLastZone', () => {
    it('should return the last zone', async () => {
      mockZoneRepository.findLastZone.mockResolvedValue(mockZoneWithNodesModel);

      const result = await service.findLastZone();

      expect(repository.findLastZone).toHaveBeenCalled();
      expect(result).toEqual(mockZoneWithNodesModel);
    });
  });

  describe('create', () => {
    const createDto: CreateZoneDto = {
      name: 'New Zone',
      description: 'New Description',
    };
    const cidr = '10.0.0.0/16';
    const gateway = '10.0.0.1';

    it('should create a zone successfully', async () => {
      mockZoneRepository.create.mockResolvedValue(mockZoneEntity);

      const result = await service.create(createDto, cidr, gateway);

      expect(repository.create).toHaveBeenCalledWith(expect.any(ZoneEntity));
      expect(result).toEqual(mockZoneEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      expect(() => service.create(createDto, cidr, gateway)).toThrow(
        UnauthorizedError,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateZoneDto = {
      name: 'Updated Zone',
      description: 'Updated Description',
    };

    it('should update a zone successfully', async () => {
      mockZoneRepository.findById.mockResolvedValue(mockZoneEntity);
      mockZoneRepository.update.mockResolvedValue(mockZoneEntity);

      const result = await service.update('z-000001', updateDto);

      expect(repository.findById).toHaveBeenCalledWith('z-000001');
      expect(repository.update).toHaveBeenCalledWith(expect.any(ZoneEntity));
      expect(result).toEqual(mockZoneEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.update('z-000001', updateDto)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('should throw NotFoundError if zone not found', async () => {
      mockZoneRepository.findById.mockResolvedValue(null);

      await expect(service.update('z-999999', updateDto)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('delete', () => {
    it('should queue the zone for deletion instead of hard-deleting it', async () => {
      mockZoneRepository.findByIdWithNodes.mockResolvedValue(
        mockZoneWithNodesModel,
      );
      mockZoneRepository.update.mockResolvedValue(mockZoneEntity);

      await service.delete('z-000001');

      expect(repository.delete).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ResourceStatus.QUEUED }),
      );
    });

    it('should refuse to delete a zone that still has nodes', async () => {
      mockZoneRepository.findByIdWithNodes.mockResolvedValue({
        zone: mockZoneEntity,
        nodes: [{ id: 'n-000001' }],
      } as unknown as ZoneWithNodesModel);

      await expect(service.delete('z-000001')).rejects.toThrow(
        'Zone has assigned nodes',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should refuse to delete a zone that is not ACTIVE or FAILED', async () => {
      mockZoneRepository.findByIdWithNodes.mockResolvedValue({
        zone: mockZoneEntity.clone({ status: ResourceStatus.PROVISIONING }),
        nodes: [],
      } as unknown as ZoneWithNodesModel);

      await expect(service.delete('z-000001')).rejects.toThrow(
        'Zone must be',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});

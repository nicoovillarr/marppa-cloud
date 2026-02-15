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
    ...mockZoneEntity,
    nodes: [],
  } as unknown as ZoneWithNodesModel;

  const mockZoneRepository = {
    findById: jest.fn(),
    findWithNodesById: jest.fn(),
    findByOwnerId: jest.fn(),
    findLastZone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

  describe('findWithNodesById', () => {
    it('should return a zone with nodes by id', async () => {
      mockZoneRepository.findWithNodesById.mockResolvedValue(
        mockZoneWithNodesModel,
      );

      const result = await service.findWithNodesById('z-000001');

      expect(repository.findWithNodesById).toHaveBeenCalledWith('z-000001');
      expect(result).toEqual(mockZoneWithNodesModel);
    });

    it('should throw NotFoundError if zone not found', async () => {
      mockZoneRepository.findWithNodesById.mockResolvedValue(null);

      await expect(service.findWithNodesById('z-999999')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('findByOwnerId', () => {
    it('should return zones by owner id from argument', async () => {
      mockZoneRepository.findByOwnerId.mockResolvedValue([mockZoneEntity]);

      const result = await service.findByOwnerId('c-000002');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000002');
      expect(result).toEqual([mockZoneEntity]);
    });

    it('should return zones by owner id from session if argument is null', async () => {
      mockZoneRepository.findByOwnerId.mockResolvedValue([mockZoneEntity]);

      const result = await service.findByOwnerId();

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([mockZoneEntity]);
    });

    it('should throw UnauthorizedError if no user in session and no ownerId provided', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      expect(() => service.findByOwnerId()).toThrow(UnauthorizedError);
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
    it('should delete a zone', async () => {
      mockZoneRepository.delete.mockResolvedValue(undefined);

      await service.delete('z-000001');

      expect(repository.delete).toHaveBeenCalledWith('z-000001');
    });
  });
});

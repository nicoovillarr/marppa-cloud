import { Test, TestingModule } from '@nestjs/testing';
import { PortalService } from './portal.service';
import {
  PortalRepository,
  PORTAL_REPOSITORY,
} from '../repositories/portal.repository';
import { PortalEntity } from '../entities/portal.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreatePortalDto } from '../../presentation/dtos/create-portal.dto';
import { UpdatePortalDto } from '../../presentation/dtos/update-portal.dto';
import { PortalType } from '../enum/portal-type.enum';
import * as SessionContext from '@/auth/infrastructure/als/session.context';
import { ZoneService } from '@/mesh/domain/services/zone.service';

describe('PortalService', () => {
  let service: PortalService;
  let repository: PortalRepository;

  const mockPortalEntity = new PortalEntity(
    'Test Portal',
    '192.168.1.1',
    PortalType.CLOUDFLARE,
    'test-api-key-123',
    ResourceStatus.ACTIVE,
    'u-000001',
    'c-000001',
    {
      description: 'Test Description',
      id: 'p-000001',
      enableCompression: true,
      corsEnabled: true,
      zoneId: 'z-000001',
      updatedBy: 'u-000001',
    },
  );

  const mockPortalRepository = {
    findById: jest.fn(),
    findByIdWithTranspondersWithNode: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockZoneService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        {
          provide: PORTAL_REPOSITORY,
          useValue: mockPortalRepository,
        },
        {
          provide: ZoneService,
          useValue: mockZoneService,
        },
      ],
    }).compile();

    service = module.get<PortalService>(PortalService);
    repository = module.get<PortalRepository>(PORTAL_REPOSITORY);

    jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);

    mockZoneService.findById.mockResolvedValue({ id: 'z-000002' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a portal by id', async () => {
      mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);

      const result = await service.findById('p-000001');

      expect(repository.findById).toHaveBeenCalledWith('p-000001');
      expect(result).toEqual(mockPortalEntity);
    });

    it('should throw NotFoundError if portal not found', async () => {
      mockPortalRepository.findById.mockResolvedValue(null);

      await expect(service.findById('p-999999')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if portal belongs to another company', async () => {
      mockPortalRepository.findById.mockResolvedValue(
        mockPortalEntity.clone({ ownerId: 'c-000002' } as any),
      );

      await expect(service.findById('p-000001')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByOwnerId', () => {
    it('should return portals of the caller company', async () => {
      mockPortalRepository.findByOwnerId.mockResolvedValue([mockPortalEntity]);

      const result = await service.findByOwnerId('c-000001');

      expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([mockPortalEntity]);
    });

    it('should throw UnauthorizedError for another company id', () => {
      expect(() => service.findByOwnerId('c-000002')).toThrow(
        UnauthorizedError,
      );
      expect(repository.findByOwnerId).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto: CreatePortalDto = {
      name: 'New Portal',
      description: 'New Description',
      address: '192.168.1.2',
      type: PortalType.CLOUDFLARE,
      apiKey: 'new-api-key-456',
      enableCompression: false,
      corsEnabled: false,
      zoneId: 'z-000002',
    };

    it('should create a portal queued for the create processor', async () => {
      mockPortalRepository.create.mockResolvedValue(mockPortalEntity);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ResourceStatus.QUEUED }),
      );
      expect(result).toEqual(mockPortalEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('should not create a portal on a zone of another company', async () => {
      mockZoneService.findById.mockRejectedValue(new NotFoundError());

      await expect(service.create(createDto)).rejects.toThrow(NotFoundError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should not look up a zone when the portal has none', async () => {
      mockPortalRepository.create.mockResolvedValue(mockPortalEntity);

      await service.create({ ...createDto, zoneId: undefined });

      expect(mockZoneService.findById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdatePortalDto = {
      name: 'Updated Portal',
      address: '192.168.1.1',
      type: PortalType.CLOUDFLARE,
      apiKey: 'api-key',
      description: 'Updated Description',
      enableCompression: true,
      corsEnabled: true,
      zoneId: 'z-000003',
    };

    it('should queue the portal with the updated fields applied', async () => {
      mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);
      mockPortalRepository.update.mockResolvedValue(mockPortalEntity);

      const result = await service.update('p-000001', updateDto);

      expect(repository.findById).toHaveBeenCalledWith('p-000001');
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Portal',
          zoneId: 'z-000003',
          status: ResourceStatus.QUEUED,
          updatedBy: 'u-000001',
        }),
      );
      expect(result).toEqual(mockPortalEntity);
    });

    it('should apply address, type and apiKey changes', async () => {
      mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);
      mockPortalRepository.update.mockResolvedValue(mockPortalEntity);

      await service.update('p-000001', {
        address: 'new.marppa.cloud',
        apiKey: 'rotated-key',
      });

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          address: 'new.marppa.cloud',
          apiKey: 'rotated-key',
        }),
      );
    });

    it('should keep the stored apiKey when the update omits it', async () => {
      mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);
      mockPortalRepository.update.mockResolvedValue(mockPortalEntity);

      await service.update('p-000001', { name: 'Renamed' });

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'test-api-key-123' }),
      );
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.update('p-000001', updateDto)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('should throw NotFoundError if portal not found', async () => {
      mockPortalRepository.findById.mockResolvedValue(null);

      await expect(service.update('p-999999', updateDto)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should not move a portal to a zone of another company', async () => {
      mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);
      mockZoneService.findById.mockRejectedValue(new NotFoundError());

      await expect(service.update('p-000001', updateDto)).rejects.toThrow(
        NotFoundError,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should queue the portal for the delete processor instead of removing the row', async () => {
      mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);
      mockPortalRepository.update.mockResolvedValue(mockPortalEntity);

      await service.delete('p-000001');

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'p-000001',
          status: ResourceStatus.QUEUED,
        }),
      );
    });

    it('should reject a portal that is not ACTIVE or FAILED', async () => {
      mockPortalRepository.findById.mockResolvedValue(
        mockPortalEntity.clone({ status: ResourceStatus.PROVISIONING }),
      );

      await expect(service.delete('p-000001')).rejects.toThrow(
        /must be ACTIVE or FAILED/,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});

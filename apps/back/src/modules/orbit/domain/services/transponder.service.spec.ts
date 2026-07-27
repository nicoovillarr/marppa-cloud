import { Test, TestingModule } from '@nestjs/testing';
import { TransponderService } from './transponder.service';
import {
  TransponderRepository,
  TRANSPONDER_REPOSITORY,
} from '../repositories/transponder.repository';
import { TransponderEntity } from '../entities/transponder.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreateTransponderDto } from '../../presentation/dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../../presentation/dtos/update-transponder.dto';
import * as SessionContext from '@/auth/infrastructure/als/session.context';
import { TransponderMode } from '../enum/transponder-mode.enum';
import { PortalService } from './portal.service';
import { NodeService } from '@/mesh/domain/services/node.service';

describe('TransponderService', () => {
  let service: TransponderService;
  let repository: TransponderRepository;

  const mockTransponderEntity = new TransponderEntity(
    '/api/v1',
    8080,
    ResourceStatus.ACTIVE,
    'u-000001',
    'p-000001',
    {
      id: 't-000001',
      mode: TransponderMode.PROXY,
      cacheEnabled: true,
      allowCookies: true,
      gzipEnabled: true,
      priority: 1,
      updatedBy: 'u-000001',
      nodeId: 'n-000001',
    },
  );

  const mockTransponderRepository = {
    findById: jest.fn(),
    findByPortalId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockPortalService = {
    findById: jest.fn(),
  };

  const mockNodeService = {
    findByIdForCaller: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransponderService,
        {
          provide: TRANSPONDER_REPOSITORY,
          useValue: mockTransponderRepository,
        },
        {
          provide: PortalService,
          useValue: mockPortalService,
        },
        {
          provide: NodeService,
          useValue: mockNodeService,
        },
      ],
    }).compile();

    service = module.get<TransponderService>(TransponderService);
    repository = module.get<TransponderRepository>(TRANSPONDER_REPOSITORY);

    jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);

    mockPortalService.findById.mockResolvedValue({ id: 'p-000001' });
    mockNodeService.findByIdForCaller.mockResolvedValue({
      id: 'n-000002',
      status: ResourceStatus.ACTIVE,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a transponder by portal id and transponder id', async () => {
      mockTransponderRepository.findById.mockResolvedValue(
        mockTransponderEntity,
      );

      const result = await service.findById('p-000001', 't-000001');

      expect(repository.findById).toHaveBeenCalledWith('p-000001', 't-000001');
      expect(result).toEqual(mockTransponderEntity);
    });

    it('should return null if transponder not found', async () => {
      mockTransponderRepository.findById.mockResolvedValue(null);

      const result = await service.findById('p-000001', 't-999999');

      expect(repository.findById).toHaveBeenCalledWith('p-000001', 't-999999');
      expect(result).toBeNull();
    });
  });

  describe('findByPortalId', () => {
    it('should return transponders by portal id', async () => {
      mockTransponderRepository.findByPortalId.mockResolvedValue([
        mockTransponderEntity,
      ]);

      const result = await service.findByPortalId('p-000001');

      expect(repository.findByPortalId).toHaveBeenCalledWith('p-000001');
      expect(result).toEqual([mockTransponderEntity]);
    });
  });

  describe('create', () => {
    const createDto: CreateTransponderDto = {
      path: '/api/v2',
      port: 9090,
      mode: TransponderMode.PROXY,
      cacheEnabled: false,
      allowCookies: false,
      gzipEnabled: false,
      priority: 2,
      nodeId: 'n-000002',
    };

    it('should create a transponder queued and linked to its node', async () => {
      mockTransponderRepository.create.mockResolvedValue(mockTransponderEntity);

      const result = await service.create('p-000001', createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: 'n-000002',
          portalId: 'p-000001',
          status: ResourceStatus.QUEUED,
        }),
      );
      expect(result).toEqual(mockTransponderEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.create('p-000001', createDto)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('should not create a transponder pointing at a node of another company', async () => {
      mockNodeService.findByIdForCaller.mockRejectedValue(new NotFoundError());

      await expect(service.create('p-000001', createDto)).rejects.toThrow(
        NotFoundError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject a node that is not ACTIVE', async () => {
      mockNodeService.findByIdForCaller.mockResolvedValue({
        id: 'n-000002',
        status: ResourceStatus.PROVISIONING,
      });

      await expect(service.create('p-000001', createDto)).rejects.toThrow(
        /Node must be ACTIVE/,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should not create a transponder on a portal of another company', async () => {
      mockPortalService.findById.mockRejectedValue(new NotFoundError());

      await expect(service.create('p-000002', createDto)).rejects.toThrow(
        NotFoundError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateTransponderDto = {
      path: '/api/v3',
      port: 7070,
      mode: TransponderMode.PROXY,
      cacheEnabled: true,
      allowCookies: true,
      gzipEnabled: true,
      priority: 3,
      nodeId: 'n-000001',
    };

    it('should queue the transponder with the updated fields applied', async () => {
      mockTransponderRepository.findById.mockResolvedValue(
        mockTransponderEntity,
      );
      mockTransponderRepository.update.mockResolvedValue(mockTransponderEntity);

      const result = await service.update('p-000001', 't-000001', updateDto);

      expect(repository.findById).toHaveBeenCalledWith('p-000001', 't-000001');
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/v3',
          port: 7070,
          status: ResourceStatus.QUEUED,
          updatedBy: 'u-000001',
        }),
      );
      expect(result).toEqual(mockTransponderEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(
        service.update('p-000001', 't-000001', updateDto),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError if transponder not found', async () => {
      mockTransponderRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('p-000001', 't-999999', updateDto),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should queue the transponder for the delete processor instead of removing the row', async () => {
      mockTransponderRepository.findById.mockResolvedValue(
        mockTransponderEntity,
      );
      mockTransponderRepository.update.mockResolvedValue(mockTransponderEntity);

      await service.delete('p-000001', 't-000001');

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 't-000001',
          status: ResourceStatus.QUEUED,
        }),
      );
    });

    it('should reject a transponder that is not ACTIVE or FAILED', async () => {
      mockTransponderRepository.findById.mockResolvedValue(
        mockTransponderEntity.clone({ status: ResourceStatus.PROVISIONING }),
      );

      await expect(service.delete('p-000001', 't-000001')).rejects.toThrow(
        /must be ACTIVE or FAILED/,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});

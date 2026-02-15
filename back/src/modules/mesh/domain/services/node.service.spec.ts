import { Test, TestingModule } from '@nestjs/testing';
import { NodeService } from './node.service';
import {
  NodeRepository,
  NODE_REPOSITORY_SYMBOL,
} from '../repositories/node.repository';
import { NodeEntity } from '../entities/node.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreateNodeDto } from '../../presentation/dtos/create-node.dto';

import * as SessionContext from '@/auth/infrastructure/als/session.context';

describe('NodeService', () => {
  let service: NodeService;
  let repository: NodeRepository;

  const mockNodeEntity = new NodeEntity(
    '10.0.0.2',
    ResourceStatus.ACTIVE,
    'z-000001',
    'u-000001',
    {
      workerId: 'w-000001',
      id: 'n-000001',
      updatedBy: 'u-000001',
    },
  );

  const mockNodeRepository = {
    findById: jest.fn(),
    findByZoneId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodeService,
        {
          provide: NODE_REPOSITORY_SYMBOL,
          useValue: mockNodeRepository,
        },
      ],
    }).compile();

    service = module.get<NodeService>(NodeService);
    repository = module.get<NodeRepository>(NODE_REPOSITORY_SYMBOL);

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
    it('should return a node by id', async () => {
      mockNodeRepository.findById.mockResolvedValue(mockNodeEntity);
      const result = await service.findById('z-000001', 'n-000001');
      expect(repository.findById).toHaveBeenCalledWith('z-000001', 'n-000001');
      expect(result).toEqual(mockNodeEntity);
    });

    it('should throw NotFoundError if node not found', async () => {
      mockNodeRepository.findById.mockResolvedValue(null);
      await expect(service.findById('z-000001', 'n-999999')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('findByZoneId', () => {
    it('should return nodes by zone id', async () => {
      mockNodeRepository.findByZoneId.mockResolvedValue([mockNodeEntity]);
      const result = await service.findByZoneId('z-000001');
      expect(repository.findByZoneId).toHaveBeenCalledWith('z-000001');
      expect(result).toEqual([mockNodeEntity]);
    });
  });

  describe('create', () => {
    const createDto: CreateNodeDto = {
      workerId: 'w-000001',
      atomId: undefined as any,
    };
    const ipAddress = '10.0.0.2';

    it('should create a node successfully', async () => {
      mockNodeRepository.create.mockResolvedValue(mockNodeEntity);
      const result = await service.create('z-000001', createDto, ipAddress);
      expect(repository.create).toHaveBeenCalledWith(expect.any(NodeEntity));
      expect(result).toEqual(mockNodeEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);
      expect(() => service.create('z-000001', createDto, ipAddress)).toThrow(
        UnauthorizedError,
      );
    });

    it('should throw Error if neither workerId nor atomId is provided', async () => {
      const invalidDto: CreateNodeDto = {
        workerId: undefined as any,
        atomId: undefined as any,
      };
      expect(() => service.create('z-000001', invalidDto, ipAddress)).toThrow(
        'Worker ID or Atom ID must be provided',
      );
    });

    it('should throw Error if both workerId and atomId are provided', async () => {
      const invalidDto: CreateNodeDto = {
        workerId: 'w-000001',
        atomId: 'a-000001',
      };
      expect(() => service.create('z-000001', invalidDto, ipAddress)).toThrow(
        'Worker ID and Atom ID cannot be provided together',
      );
    });
  });

  describe('delete', () => {
    it('should delete a node', async () => {
      mockNodeRepository.delete.mockResolvedValue(undefined);
      await service.delete('z-000001', 'n-000001');
      expect(repository.delete).toHaveBeenCalledWith('z-000001', 'n-000001');
    });
  });
});

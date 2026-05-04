import { Test, TestingModule } from '@nestjs/testing';
import { FiberService } from './fiber.service';
import {
  FiberRepository,
  FIBER_REPOSITORY_SYMBOL,
} from '../repositories/fiber.repository';
import { FiberEntity } from '../entities/fiber.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreateFiberDto } from '../../presentation/dtos/create-fiber.dto';
import * as SessionContext from '@/auth/infrastructure/als/session.context';

describe('FiberService', () => {
  let service: FiberService;
  let repository: FiberRepository;

  const mockFiberEntity = new FiberEntity(
    'tcp',
    80,
    ResourceStatus.ACTIVE,
    'n-000001',
    'u-000001',
    {
      id: 1,
    },
  );

  const mockFiberRepository = {
    findById: jest.fn(),
    findByNodeId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiberService,
        {
          provide: FIBER_REPOSITORY_SYMBOL,
          useValue: mockFiberRepository,
        },
      ],
    }).compile();

    service = module.get<FiberService>(FiberService);
    repository = module.get<FiberRepository>(FIBER_REPOSITORY_SYMBOL);

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
    it('should return a fiber by id', async () => {
      mockFiberRepository.findById.mockResolvedValue(mockFiberEntity);

      const result = await service.findById('z-000001', 'n-000001', 1);

      expect(repository.findById).toHaveBeenCalledWith(
        'z-000001',
        'n-000001',
        1,
      );
      expect(result).toEqual(mockFiberEntity);
    });

    it('should throw NotFoundError if fiber not found', async () => {
      mockFiberRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('z-000001', 'n-000001', 999),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByNodeId', () => {
    it('should return fibers by node id', async () => {
      mockFiberRepository.findByNodeId.mockResolvedValue([mockFiberEntity]);

      const result = await service.findByNodeId('z-000001', 'n-000001');

      expect(repository.findByNodeId).toHaveBeenCalledWith(
        'z-000001',
        'n-000001',
      );
      expect(result).toEqual([mockFiberEntity]);
    });
  });

  describe('create', () => {
    const createDto: CreateFiberDto = {
      protocol: 'tcp',
      targetPort: 80,
    };

    it('should create a fiber successfully', async () => {
      mockFiberRepository.create.mockResolvedValue(mockFiberEntity);

      const result = await service.create('n-000001', createDto);

      expect(repository.create).toHaveBeenCalledWith(expect.any(FiberEntity));
      expect(result).toEqual(mockFiberEntity);
    });

    it('should throw UnauthorizedError if no user in session', async () => {
      jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.create('n-000001', createDto)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe('delete', () => {
    it('should delete a fiber', async () => {
      mockFiberRepository.delete.mockResolvedValue(undefined);

      await service.delete('z-000001', 'n-000001', 1);

      expect(repository.delete).toHaveBeenCalledWith('z-000001', 'n-000001', 1);
    });
  });
});

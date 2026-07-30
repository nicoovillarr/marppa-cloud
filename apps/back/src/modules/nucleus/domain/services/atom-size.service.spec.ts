import { Test, TestingModule } from '@nestjs/testing';
import { AtomSizeService } from './atom-size.service';
import {
  ATOM_SIZE_REPOSITORY_SYMBOL,
  AtomSizeRepository,
} from '../repositories/atom-size.repository';
import { AtomSizeEntity } from '../entities/atom-size.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { AtomSizeAlreadyExistsError } from '../errors/atom-size-already-exists.error';
import { AtomSizeDeprecatedError } from '../errors/atom-size-deprecated.error';

describe('AtomSizeService', () => {
  let service: AtomSizeService;
  let repository: AtomSizeRepository;

  const mockAtomSize = new AtomSizeEntity('small', 0.5, 512, { id: 1 });

  const mockAtomSizeRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    findMaxVersion: jest.fn(),
    create: jest.fn(),
    deprecate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtomSizeService,
        {
          provide: ATOM_SIZE_REPOSITORY_SYMBOL,
          useValue: mockAtomSizeRepository,
        },
      ],
    }).compile();

    service = module.get<AtomSizeService>(AtomSizeService);
    repository = module.get<AtomSizeRepository>(ATOM_SIZE_REPOSITORY_SYMBOL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should hide deprecated sizes by default', async () => {
      mockAtomSizeRepository.findAll.mockResolvedValue([mockAtomSize]);

      await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError when the size does not exist', async () => {
      mockAtomSizeRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    const dto = { name: 'small', cpuCores: 0.5, ramMB: 512 };

    it('should create a size', async () => {
      mockAtomSizeRepository.findMaxVersion.mockResolvedValue(0);
      mockAtomSizeRepository.create.mockResolvedValue(mockAtomSize);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.any(AtomSizeEntity));
      expect(result).toEqual(mockAtomSize);
    });

    it('should refuse a name already in the catalog', async () => {
      mockAtomSizeRepository.findMaxVersion.mockResolvedValue(1);

      await expect(service.create(dto)).rejects.toThrow(
        AtomSizeAlreadyExistsError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('revise', () => {
    const dto = { cpuCores: 1, ramMB: 2048 };

    it('should add a version and deprecate the current one', async () => {
      mockAtomSizeRepository.findById.mockResolvedValue(mockAtomSize);
      mockAtomSizeRepository.findMaxVersion.mockResolvedValue(2);
      mockAtomSizeRepository.create.mockImplementation(
        (entity: AtomSizeEntity) => Promise.resolve(entity),
      );

      const result = await service.revise(1, dto);

      expect(result.name).toBe('small');
      expect(result.version).toBe(3);
      expect(result.ramMB).toBe(2048);
      expect(repository.deprecate).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should refuse to revise a deprecated size', async () => {
      mockAtomSizeRepository.findById.mockResolvedValue(
        new AtomSizeEntity('old', 0.5, 512, {
          id: 2,
          deprecatedAt: new Date(),
        }),
      );

      await expect(service.revise(2, dto)).rejects.toThrow(
        AtomSizeDeprecatedError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('deprecate', () => {
    it('should leave an already deprecated size untouched', async () => {
      mockAtomSizeRepository.findById.mockResolvedValue(
        new AtomSizeEntity('old', 0.5, 512, {
          id: 3,
          deprecatedAt: new Date(),
        }),
      );

      await service.deprecate(3);

      expect(repository.deprecate).not.toHaveBeenCalled();
    });
  });
});

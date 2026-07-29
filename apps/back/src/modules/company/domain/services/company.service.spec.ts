import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import {
  CompanyRepository,
  COMPANY_REPOSITORY_SYMBOL,
} from '../repositories/company.repository';
import { CompanyEntity } from '../entities/company.entity';
import { CreateCompanyDto } from '../../presentation/dtos/create-company.dto';
import { UpdateCompanyDto } from '../../presentation/dtos/update-company.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';

describe('CompanyService', () => {
  let service: CompanyService;
  let repository: CompanyRepository;

  const mockCompany: CompanyEntity = new CompanyEntity('Test Company', {
    id: '1',
    alias: 'Test',
    description: 'A test company',
  });

  const mockCompanyRepository = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: COMPANY_REPOSITORY_SYMBOL,
          useValue: mockCompanyRepository,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    repository = module.get<CompanyRepository>(COMPANY_REPOSITORY_SYMBOL);

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: '1',
      email: 'test@test.com',
      type: 'access',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a company', async () => {
      const dto: CreateCompanyDto = {
        name: 'Test Company',
        alias: 'Test',
        description: 'A test company',
      };
      mockCompanyRepository.create.mockResolvedValue(mockCompany);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.any(CompanyEntity));
      expect(result).toEqual(mockCompany);
    });
  });

  describe('update', () => {
    it('should update a company', async () => {
      const dto: UpdateCompanyDto = {
        name: 'Updated Company',
        alias: 'Updated',
        description: 'Updated description',
      };
      const updatedCompany = new CompanyEntity('Updated Company', {
        id: '1',
        alias: 'Updated',
        description: 'Updated description',
      });

      mockCompanyRepository.update.mockResolvedValue(updatedCompany);

      const result = await service.update('1', dto);

      expect(repository.update).toHaveBeenCalledWith(
        '1',
        expect.any(CompanyEntity),
      );
      expect(result).toEqual(updatedCompany);
    });
  });

  describe('delete', () => {
    it('should delete a company', async () => {
      mockCompanyRepository.delete.mockResolvedValue(undefined);

      await service.delete('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('findById', () => {
    it('should return a company by id', async () => {
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);

      const result = await service.findById('1');

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockCompany);
    });

    it('should throw NotFoundError if company not found', async () => {
      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000001',
        companyId: '999',
        email: 'test@test.com',
        type: 'access',
      } as any);
      mockCompanyRepository.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundError);
      expect(repository.findById).toHaveBeenCalledWith('999');
    });

    it('should throw NotFoundError when the company belongs to another owner', async () => {
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);

      await expect(service.findById('other-company')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});

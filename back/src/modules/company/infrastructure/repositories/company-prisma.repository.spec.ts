import { Test, TestingModule } from '@nestjs/testing';
import { CompanyPrismaRepository } from './company-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { CompanyEntity } from '../../domain/entities/company.entity';

describe('CompanyPrismaRepository (Integration)', () => {
  let repository: CompanyPrismaRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<CompanyPrismaRepository>(CompanyPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.company.deleteMany({
      where: {
        name: { contains: 'Integration Test' },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdCompanyId: string;

    it('should create a company', async () => {
      const company = new CompanyEntity('Integration Test Company', {
        alias: 'ITC',
        description: 'Created by integration test',
      });

      const result = await repository.create(company);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Integration Test Company');
      createdCompanyId = result.id!;
    });

    it('should find a company by id', async () => {
      const result = await repository.findById(createdCompanyId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdCompanyId);
      expect(result?.name).toBe('Integration Test Company');
    });

    it('should update a company', async () => {
      const company = new CompanyEntity('Integration Test Company Updated', {
        id: createdCompanyId,
        alias: 'ITC-UPDATED',
        description: 'Updated by integration test',
      });

      const result = await repository.update(createdCompanyId, company);

      expect(result).toBeDefined();
      expect(result.name).toBe('Integration Test Company Updated');
      expect(result.alias).toBe('ITC-UPDATED');
    });

    it('should find all companies', async () => {
      const result = await repository.findAll();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const found = result.find(c => c.id === createdCompanyId);
      expect(found).toBeDefined();
    });

    it('should delete a company', async () => {
      await repository.delete(createdCompanyId);

      const result = await repository.findById(createdCompanyId);
      expect(result).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFamilyPrismaRepository } from './worker-family-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerFamilyEntity } from '../../domain/entities/worker-family.entity';

describe('WorkerFamilyPrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-family';

  let repository: WorkerFamilyPrismaRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerFamilyPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerFamilyPrismaRepository>(WorkerFamilyPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.workerFamily.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdFamilyId: number;

    it('should create a worker family', async () => {
      const family = new WorkerFamilyEntity(
        `${testNamePrefix}-create`,
        {
          description: 'Test family description',
        }
      );

      const result = await repository.create(family);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(`${testNamePrefix}-create`);
      expect(result.description).toBe('Test family description');
      createdFamilyId = result.id!;
    });

    it('should find a worker family by id', async () => {
      const result = await repository.findById(createdFamilyId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdFamilyId);
      expect(result?.name).toBe(`${testNamePrefix}-create`);
    });

    it('should return null for non-existent worker family id', async () => {
      const result = await repository.findById(999999);

      expect(result).toBeNull();
    });

    it('should update a worker family', async () => {
      const existingFamily = await repository.findById(createdFamilyId);
      const updatedFamily = existingFamily!.clone({
        name: `${testNamePrefix}-updated`,
        description: 'Updated description',
      });

      const result = await repository.update(updatedFamily);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdFamilyId);
      expect(result.name).toBe(`${testNamePrefix}-updated`);
      expect(result.description).toBe('Updated description');
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findById(createdFamilyId);

      expect(result).toBeDefined();
      expect(result?.name).toBe(`${testNamePrefix}-updated`);
      expect(result?.description).toBe('Updated description');
    });

    it('should delete a worker family', async () => {
      await repository.delete(createdFamilyId);

      const result = await repository.findById(createdFamilyId);
      expect(result).toBeNull();
    });
  });
});

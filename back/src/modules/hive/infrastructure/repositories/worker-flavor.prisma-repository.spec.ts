import { Test, TestingModule } from '@nestjs/testing';
import { WorkerFlavorPrismaRepository } from './worker-flavor.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerFlavorEntity } from '../../domain/entities/worker-flavor.entity';

describe('WorkerFlavorPrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-flavor';

  let repository: WorkerFlavorPrismaRepository;
  let prisma: PrismaService;
  let testFamilyId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerFlavorPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerFlavorPrismaRepository>(WorkerFlavorPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);

    // Create a test family for the flavors
    const family = await prisma.workerFamily.create({
      data: {
        name: `${testNamePrefix}-family`,
        description: 'Test family for flavors',
      },
    });
    testFamilyId = family.id;
  });

  afterAll(async () => {
    await prisma.workerFlavor.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });
    await prisma.workerFamily.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdFlavorId: number;

    it('should create a worker flavor', async () => {
      const flavor = new WorkerFlavorEntity(
        `${testNamePrefix}-create`,
        4,
        8192,
        100,
        testFamilyId,
      );

      const result = await repository.create(flavor);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(`${testNamePrefix}-create`);
      expect(result.cpuCores).toBe(4);
      expect(result.ramMB).toBe(8192);
      expect(result.diskGB).toBe(100);
      createdFlavorId = result.id!;
    });

    it('should find a worker flavor by id', async () => {
      const result = await repository.findById(createdFlavorId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdFlavorId);
      expect(result?.name).toBe(`${testNamePrefix}-create`);
    });

    it('should return null for non-existent worker flavor id', async () => {
      const result = await repository.findById(999999);

      expect(result).toBeNull();
    });

    it('should update a worker flavor', async () => {
      const existingFlavor = await repository.findById(createdFlavorId);
      const updatedFlavor = existingFlavor!.clone({
        name: `${testNamePrefix}-updated`,
        cpuCores: 8,
        ramMB: 16384,
      });

      const result = await repository.update(updatedFlavor);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdFlavorId);
      expect(result.name).toBe(`${testNamePrefix}-updated`);
      expect(result.cpuCores).toBe(8);
      expect(result.ramMB).toBe(16384);
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findById(createdFlavorId);

      expect(result).toBeDefined();
      expect(result?.name).toBe(`${testNamePrefix}-updated`);
      expect(result?.cpuCores).toBe(8);
      expect(result?.ramMB).toBe(16384);
    });

    it('should delete a worker flavor', async () => {
      await repository.delete(createdFlavorId);

      const result = await repository.findById(createdFlavorId);
      expect(result).toBeNull();
    });
  });
});

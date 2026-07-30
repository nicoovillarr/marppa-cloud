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

    repository = module.get<WorkerFlavorPrismaRepository>(
      WorkerFlavorPrismaRepository,
    );
    prisma = module.get<PrismaService>(PrismaService);

    const { id: familyId } = await prisma.workerFamily.create({
      data: {
        name: `${testNamePrefix}-family`,
        description: 'Test family for flavors',
        architecture: 'amd64',
      },
    });

    testFamilyId = familyId;
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

    it('should find a worker flavor with its family', async () => {
      const result = await repository.findByIdWithFamily(createdFlavorId);

      expect(result?.family.id).toBe(testFamilyId);
      expect(result?.qualifiedName).toBe(
        `${testNamePrefix}-family.${testNamePrefix}-create`,
      );
    });

    it('should report the highest version of a flavor name', async () => {
      const result = await repository.findMaxVersion(
        testFamilyId,
        `${testNamePrefix}-create`,
      );

      expect(result).toBe(1);
    });

    it('should store a second version alongside the first', async () => {
      const revision = new WorkerFlavorEntity(
        `${testNamePrefix}-create`,
        8,
        16384,
        100,
        testFamilyId,
        { version: 2 },
      );

      const result = await repository.create(revision);

      expect(result.version).toBe(2);
      expect(result.cpuCores).toBe(8);
      expect(
        await repository.findMaxVersion(
          testFamilyId,
          `${testNamePrefix}-create`,
        ),
      ).toBe(2);
    });

    it('should deprecate a worker flavor and drop it from the active list', async () => {
      await repository.deprecate(createdFlavorId, new Date());

      const result = await repository.findById(createdFlavorId);
      expect(result?.isDeprecated).toBe(true);

      const active = await repository.findAll(false);
      expect(active.map((flavor) => flavor.id)).not.toContain(createdFlavorId);

      const all = await repository.findAll(true);
      expect(all.map((flavor) => flavor.id)).toContain(createdFlavorId);
    });
  });
});

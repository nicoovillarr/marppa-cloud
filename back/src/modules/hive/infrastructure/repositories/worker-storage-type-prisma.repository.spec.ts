import { Test, TestingModule } from '@nestjs/testing';
import { WorkerStorageTypePrismaRepository } from './worker-storage-type-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerStorageTypeEntity } from '../../domain/entities/worker-storage-type.entity';

describe('WorkerStorageTypePrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-storage';

  let repository: WorkerStorageTypePrismaRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerStorageTypePrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerStorageTypePrismaRepository>(WorkerStorageTypePrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.workerStorageType.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdStorageTypeId: number;

    it('should create a worker storage type', async () => {
      const storageType = new WorkerStorageTypeEntity(
        `${testNamePrefix}-create`,
        true,
        true,
        false,
        {
          description: 'Test storage type description',
        }
      );

      const result = await repository.create(storageType);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(`${testNamePrefix}-create`);
      expect(result.persistent).toBe(true);
      expect(result.attachable).toBe(true);
      expect(result.shared).toBe(false);
      createdStorageTypeId = result.id!;
    });

    it('should find a worker storage type by id', async () => {
      const result = await repository.findById(createdStorageTypeId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdStorageTypeId);
      expect(result?.name).toBe(`${testNamePrefix}-create`);
    });

    it('should return null for non-existent worker storage type id', async () => {
      const result = await repository.findById(999999);

      expect(result).toBeNull();
    });

    it('should update a worker storage type', async () => {
      const existingStorageType = await repository.findById(createdStorageTypeId);
      const updatedStorageType = existingStorageType!.clone({
        name: `${testNamePrefix}-updated`,
        persistent: false,
        shared: true,
      });

      const result = await repository.update(updatedStorageType);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdStorageTypeId);
      expect(result.name).toBe(`${testNamePrefix}-updated`);
      expect(result.persistent).toBe(false);
      expect(result.shared).toBe(true);
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findById(createdStorageTypeId);

      expect(result).toBeDefined();
      expect(result?.name).toBe(`${testNamePrefix}-updated`);
      expect(result?.persistent).toBe(false);
      expect(result?.shared).toBe(true);
    });

    it('should delete a worker storage type', async () => {
      await repository.delete(createdStorageTypeId);

      const result = await repository.findById(createdStorageTypeId);
      expect(result).toBeNull();
    });
  });
});

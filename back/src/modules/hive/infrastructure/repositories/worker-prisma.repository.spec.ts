import { Test, TestingModule } from '@nestjs/testing';
import { WorkerPrismaRepository } from './worker-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerEntity } from '../../domain/entities/worker.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('WorkerPrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-worker';

  let repository: WorkerPrismaRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerPrismaRepository>(WorkerPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.worker.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdWorkerId: string;

    it('should create a worker', async () => {
      const worker = new WorkerEntity(
        `${testNamePrefix}-create`,
        ResourceStatus.INACTIVE,
        '00:11:22:33:44:55',
        'u-000001',
        1,
        1,
        'c-000001',
      );

      const result = await repository.create(worker);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(`${testNamePrefix}-create`);
      expect(result.status).toBe(ResourceStatus.INACTIVE);
      expect(result.macAddress).toBe('00:11:22:33:44:55');
      createdWorkerId = result.id!;
    });

    it('should find a worker by id', async () => {
      const result = await repository.findById(createdWorkerId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdWorkerId);
      expect(result?.name).toBe(`${testNamePrefix}-create`);
    });

    it('should return null for non-existent worker id', async () => {
      const result = await repository.findById('w-nonexistent');

      expect(result).toBeNull();
    });

    it('should find workers by owner id', async () => {
      const result = await repository.findByOwnerId('c-000001');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const found = result.find(w => w.id === createdWorkerId);
      expect(found).toBeDefined();
    });

    it('should return empty array for non-existent owner id', async () => {
      const result = await repository.findByOwnerId('c-nonexistent');

      expect(result).toEqual([]);
    });

    it('should update a worker', async () => {
      const existingWorker = await repository.findById(createdWorkerId);
      const updatedWorker = existingWorker!.clone({
        name: `${testNamePrefix}-updated`,
        status: ResourceStatus.ACTIVE,
      });

      const result = await repository.update(updatedWorker);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdWorkerId);
      expect(result.name).toBe(`${testNamePrefix}-updated`);
      expect(result.status).toBe(ResourceStatus.ACTIVE);
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findById(createdWorkerId);

      expect(result).toBeDefined();
      expect(result?.name).toBe(`${testNamePrefix}-updated`);
      expect(result?.status).toBe(ResourceStatus.ACTIVE);
    });

    it('should delete a worker', async () => {
      await repository.delete(createdWorkerId);

      const result = await repository.findById(createdWorkerId);
      expect(result).toBeNull();
    });
  });
});

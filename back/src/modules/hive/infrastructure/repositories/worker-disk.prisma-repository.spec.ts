import { Test, TestingModule } from '@nestjs/testing';
import { WorkerDiskPrismaRepository } from './worker-disk.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerDiskEntity } from '../../domain/entities/worker-disk.entity';

describe('WorkerDiskPrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-disk';

  let repository: WorkerDiskPrismaRepository;
  let prisma: PrismaService;

  let testWorkerStorageTypeId;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerDiskPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerDiskPrismaRepository>(WorkerDiskPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);

    const { id: workerStorageTypeId } = await prisma.workerStorageType.create({
      data: {
        name: `${testNamePrefix}-type`,
        description: 'Created by integration test',
        attachable: true,
        shared: false,
        persistent: true,
      },
    });

    testWorkerStorageTypeId = workerStorageTypeId;
  });

  afterAll(async () => {
    await prisma.workerDisk.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });

    await prisma.workerStorageType.delete({
      where: {
        id: testWorkerStorageTypeId,
      },
    });

    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdDiskId: number;

    it('should create a worker disk', async () => {
      const disk = new WorkerDiskEntity(
        `${testNamePrefix}-create`,
        100,
        '/dev/test1',
        'c-000001',
        testWorkerStorageTypeId,
        'u-000001',
        {
          mountPoint: '/mnt/test',
          isBoot: false,
        }
      );

      const result = await repository.create(disk);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(`${testNamePrefix}-create`);
      expect(result.sizeGiB).toBe(100);
      expect(result.hostPath).toBe('/dev/test1');
      createdDiskId = result.id!;
    });

    it('should find a worker disk by id', async () => {
      const result = await repository.findById(createdDiskId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdDiskId);
      expect(result?.name).toBe(`${testNamePrefix}-create`);
    });

    it('should return null for non-existent worker disk id', async () => {
      const result = await repository.findById(0);

      expect(result).toBeNull();
    });

    it('should find worker disks by owner id', async () => {
      const result = await repository.findByOwnerId('c-000001');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const found = result.find(d => d.id === createdDiskId);
      expect(found).toBeDefined();
    });

    it('should return empty array for non-existent owner id', async () => {
      const result = await repository.findByOwnerId('c-nonexistent');

      expect(result).toEqual([]);
    });

    it('should update a worker disk', async () => {
      const existingDisk = await repository.findById(createdDiskId);
      const updatedDisk = existingDisk!.clone({
        name: `${testNamePrefix}-updated`,
        sizeGiB: 200,
      });

      const result = await repository.update(updatedDisk);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdDiskId);
      expect(result.name).toBe(`${testNamePrefix}-updated`);
      expect(result.sizeGiB).toBe(200);
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findById(createdDiskId);

      expect(result).toBeDefined();
      expect(result?.name).toBe(`${testNamePrefix}-updated`);
      expect(result?.sizeGiB).toBe(200);
    });

    it('should delete a worker disk', async () => {
      await repository.delete(createdDiskId);

      const result = await repository.findById(createdDiskId);
      expect(result).toBeNull();
    });
  });
});

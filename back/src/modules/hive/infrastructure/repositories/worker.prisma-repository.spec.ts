import { Test, TestingModule } from '@nestjs/testing';
import { WorkerPrismaRepository } from './worker.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerEntity } from '../../domain/entities/worker.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('WorkerPrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-worker';

  let repository: WorkerPrismaRepository;
  let prisma: PrismaService;

  let testWorkerFamilyId, testWorkerFlavorId, testWorkerImageId;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerPrismaRepository>(WorkerPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);

    const { id: workerFamilyId } = await prisma.workerFamily.create({
      data: {
        name: `${testNamePrefix}-family`,
      },
    });

    const { id: workerFlavorId } = await prisma.workerFlavor.create({
      data: {
        name: `${testNamePrefix}-flavor`,
        diskGB: 10,
        ramMB: 1024,
        cpuCores: 1,
        family: {
          connect: {
            id: workerFamilyId,
          },
        },
      },
    });

    const { id: workerImageId } = await prisma.workerImage.create({
      data: {
        name: `${testNamePrefix}-image`,
        description: 'Created by integration test',
        osVersion: '11.0',
        architecture: 'amd64',
        imageUrl: 'https://example.com/image.qcow2',
        osFamily: 'debian',
        osType: 'linux',
        virtualizationType: 'kvm',
      },
    });

    testWorkerFamilyId = workerFamilyId;
    testWorkerFlavorId = workerFlavorId;
    testWorkerImageId = workerImageId;
  });

  afterAll(async () => {
    await prisma.worker.deleteMany({
      where: {
        name: { contains: testNamePrefix },
      },
    });

    await prisma.workerFlavor.delete({
      where: {
        id: testWorkerFlavorId,
      },
    });

    await prisma.workerImage.delete({
      where: {
        id: testWorkerImageId,
      },
    });

    await prisma.workerFamily.delete({
      where: {
        id: testWorkerFamilyId,
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
        testWorkerImageId,
        testWorkerFlavorId,
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
      const found = result.find((w) => w.id === createdWorkerId);
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

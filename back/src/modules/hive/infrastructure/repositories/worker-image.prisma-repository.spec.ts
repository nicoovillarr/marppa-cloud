import { Test, TestingModule } from '@nestjs/testing';
import { WorkerImagePrismaRepository } from './worker-image.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerImageEntity } from '../../domain/entities/worker-image.entity';

describe('WorkerImagePrismaRepository (Integration)', () => {
  const testNamePrefix = 'integration-test-image';

  let repository: WorkerImagePrismaRepository;
  let prisma: PrismaService;

  let testWorkerStorageTypeId;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerImagePrismaRepository, PrismaService],
    }).compile();

    repository = module.get<WorkerImagePrismaRepository>(WorkerImagePrismaRepository);
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
    await prisma.workerImage.deleteMany({
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
    let createdImageId: number;

    it('should create a worker image', async () => {
      const image = new WorkerImageEntity(
        `${testNamePrefix}-create`,
        'Linux',
        'Debian',
        'https://example.com/test-image.iso',
        'x86_64',
        'KVM',
        {
          description: 'Test image description',
          osVersion: '11.0',
          workerStorageTypeId: testWorkerStorageTypeId,
        }
      );

      const result = await repository.create(image);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(`${testNamePrefix}-create`);
      expect(result.osType).toBe('Linux');
      expect(result.osFamily).toBe('Debian');
      expect(result.architecture).toBe('x86_64');
      createdImageId = result.id!;
    });

    it('should find a worker image by id', async () => {
      const result = await repository.findById(createdImageId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdImageId);
      expect(result?.name).toBe(`${testNamePrefix}-create`);
    });

    it('should return null for non-existent worker image id', async () => {
      const result = await repository.findById(999999);

      expect(result).toBeNull();
    });

    it('should update a worker image', async () => {
      const existingImage = await repository.findById(createdImageId);
      const updatedImage = existingImage!.clone({
        name: `${testNamePrefix}-updated`,
        osVersion: '12.0',
        description: 'Updated description',
      });

      const result = await repository.update(updatedImage);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdImageId);
      expect(result.name).toBe(`${testNamePrefix}-updated`);
      expect(result.osVersion).toBe('12.0');
      expect(result.description).toBe('Updated description');
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findById(createdImageId);

      expect(result).toBeDefined();
      expect(result?.name).toBe(`${testNamePrefix}-updated`);
      expect(result?.osVersion).toBe('12.0');
    });

    it('should delete a worker image', async () => {
      await repository.delete(createdImageId);

      const result = await repository.findById(createdImageId);
      expect(result).toBeNull();
    });
  });
});

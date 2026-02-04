import { Test, TestingModule } from '@nestjs/testing';
import { UserPrismaRepository } from './user-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { UserEntity } from '../../domain/entities/user.entity';

describe('UserPrismaRepository (Integration)', () => {
  const testEmailPrefix = 'integration-test';

  let repository: UserPrismaRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<UserPrismaRepository>(UserPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { contains: testEmailPrefix },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdUserId: string;

    it('should create a user', async () => {
      const user = new UserEntity(
        `${testEmailPrefix}-create@example.com`,
        'hashedPassword123',
        'Integration Test User'
      );

      const result = await repository.createUser(user);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(`${testEmailPrefix}-create@example.com`);
      expect(result.name).toBe('Integration Test User');
      expect(result.password).toBe('hashedPassword123');
      createdUserId = result.id!;
    });

    it('should find a user by id', async () => {
      const result = await repository.findUserById(createdUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdUserId);
      expect(result?.email).toBe(`${testEmailPrefix}-create@example.com`);
      expect(result?.name).toBe('Integration Test User');
    });

    it('should return null for non-existent user id', async () => {
      const result = await repository.findUserById('u-nonexistent');

      expect(result).toBeNull();
    });

    it('should check if email exists', async () => {
      const exists = await repository.emailExists(`${testEmailPrefix}-create@example.com`);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await repository.emailExists(`${testEmailPrefix}-nonexistent@example.com`);

      expect(exists).toBe(false);
    });

    it('should find a user by email', async () => {
      const result = await repository.findUserByEmail(`${testEmailPrefix}-create@example.com`);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdUserId);
      expect(result?.email).toBe(`${testEmailPrefix}-create@example.com`);
    });

    it('should return null for non-existent email', async () => {
      const result = await repository.findUserByEmail(`${testEmailPrefix}-notfound@example.com`);

      expect(result).toBeNull();
    });

    it('should update a user', async () => {
      const updatedUser = new UserEntity(
        `${testEmailPrefix}-create@example.com`,
        'newHashedPassword456',
        'Updated Test User',
        {
          id: createdUserId,
        }
      );

      const result = await repository.updateUser(updatedUser);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdUserId);
      expect(result.name).toBe('Updated Test User');
      expect(result.password).toBe('newHashedPassword456');
      expect(result.email).toBe(`${testEmailPrefix}-create@example.com`);
    });

    it('should verify the update persisted', async () => {
      const result = await repository.findUserById(createdUserId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Test User');
      expect(result?.password).toBe('newHashedPassword456');
    });

    it('should create another user for cleanup test', async () => {
      const user = new UserEntity(
        `${testEmailPrefix}-cleanup@example.com`,
        'hashedPassword789',
        'Cleanup Test User'
      );

      const result = await repository.createUser(user);

      expect(result).toBeDefined();
      expect(result.email).toBe(`${testEmailPrefix}-cleanup@example.com`);
    });
  });
});

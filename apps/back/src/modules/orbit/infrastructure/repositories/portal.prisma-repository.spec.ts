import { Test, TestingModule } from '@nestjs/testing';
import { PortalPrismaRepository } from './portal.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PortalEntity } from '../../domain/entities/portal.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { PortalType } from '../../domain/enum/portal-type.enum';

describe('PortalPrismaRepository (Integration)', () => {
  let repository: PortalPrismaRepository;
  let prisma: PrismaService;

  const testCompanyId = 'c-000001';
  const testAddress = `integration-test-${Date.now()}.marppa.cloud`;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortalPrismaRepository, PrismaService],
    }).compile();

    repository = module.get<PortalPrismaRepository>(PortalPrismaRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.portal.deleteMany({
      where: {
        name: { contains: 'Test Portal' },
      },
    });

    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdPortalId: string;

    it('should create a portal', async () => {
      const portal = new PortalEntity(
        'Test Portal Integration',
        testAddress,
        PortalType.CLOUDFLARE,
        'test-api-key-integration-123',
        ResourceStatus.ACTIVE,
        'u-000001',
        testCompanyId,
        {
          description: 'Test Description',
          listenHttp: true,
          listenHttps: true,
          enableCompression: true,
          cacheEnabled: true,
          corsEnabled: true,
          defaultServer: false,
          updatedBy: 'u-000001',
        },
      );

      const result = await repository.create(portal);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Portal Integration');
      expect(result.address).toBe(testAddress);
      expect(result.type).toBe(PortalType.CLOUDFLARE);
      expect(result.apiKey).toBe('test-api-key-integration-123');
      expect(result.ownerId).toBe(testCompanyId);
      createdPortalId = result.id!;
    });

    it('should find a portal by id', async () => {
      const result = await repository.findById(createdPortalId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdPortalId);
      expect(result?.name).toBe('Test Portal Integration');
      expect(result?.address).toBe(testAddress);
    });

    it('should find portals by owner id', async () => {
      const result = await repository.findByOwnerId(testCompanyId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((p) => p.id === createdPortalId)).toBe(true);
    });

    it('should update a portal', async () => {
      const portal = await repository.findById(createdPortalId);
      if (!portal) throw new Error('Portal not found');

      const updatedPortal = portal.clone({
        description: 'Updated Description',
        listenHttp: false,
        cacheEnabled: false,
      });

      const result = await repository.update(updatedPortal);

      expect(result).toBeDefined();
      expect(result.description).toBe('Updated Description');
      expect(result.listenHttp).toBe(false);
      expect(result.cacheEnabled).toBe(false);
    });

    it('should delete a portal', async () => {
      await repository.delete(createdPortalId);

      const result = await repository.findById(createdPortalId);
      expect(result).toBeNull();
    });
  });
});

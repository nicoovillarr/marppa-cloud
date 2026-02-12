import { Test, TestingModule } from '@nestjs/testing';
import { PortalPrismaRepository } from './portal.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PortalEntity } from '../../domain/entities/portal.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { PortalType } from '../../domain/enum/portal-type.enum';

describe('PortalPrismaRepository (Integration)', () => {
    let repository: PortalPrismaRepository;
    let prisma: PrismaService;

    const testCompanyId = 'c-test-portal-integration';
    const testZoneId = 'z-test-portal-integration';

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PortalPrismaRepository, PrismaService],
        }).compile();

        repository = module.get<PortalPrismaRepository>(PortalPrismaRepository);
        prisma = module.get<PrismaService>(PrismaService);

        // Clean up previous run if any
        await prisma.portal.deleteMany({
            where: {
                name: { contains: 'Test Portal' },
            },
        });
        await prisma.zone.deleteMany({
            where: { id: testZoneId },
        });
        await prisma.company.deleteMany({
            where: { id: testCompanyId },
        });

        // Create test company
        await prisma.company.create({
            data: {
                id: testCompanyId,
                name: 'Test Company Portal Integration',
            }
        });

        // Create test zone
        await prisma.zone.create({
            data: {
                id: testZoneId,
                name: 'Test Zone Portal Integration',
                cidr: '10.0.0.0/16',
                gateway: '10.0.0.1',
                status: ResourceStatus.ACTIVE,
                createdBy: 'u-000001',
                ownerId: testCompanyId,
                updatedBy: 'u-000001',
            }
        });
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({
            where: {
                name: { contains: 'Test Portal' },
            },
        });
        await prisma.zone.delete({
            where: { id: testZoneId },
        });
        await prisma.company.delete({
            where: { id: testCompanyId },
        });
        await prisma.$disconnect();
    });

    describe('CRUD Operations', () => {
        let createdPortalId: string;

        it('should create a portal', async () => {
            const portal = new PortalEntity(
                'Test Portal Integration',
                '192.168.1.100',
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
                    zoneId: testZoneId,
                    updatedBy: 'u-000001',
                }
            );

            const result = await repository.create(portal);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.name).toBe('Test Portal Integration');
            expect(result.address).toBe('192.168.1.100');
            expect(result.type).toBe(PortalType.CLOUDFLARE);
            expect(result.apiKey).toBe('test-api-key-integration-123');
            expect(result.ownerId).toBe(testCompanyId);
            expect(result.zoneId).toBe(testZoneId);
            createdPortalId = result.id!;
        });

        it('should find a portal by id', async () => {
            const result = await repository.findById(createdPortalId);

            expect(result).toBeDefined();
            expect(result?.id).toBe(createdPortalId);
            expect(result?.name).toBe('Test Portal Integration');
            expect(result?.address).toBe('192.168.1.100');
        });

        it('should find portals by owner id', async () => {
            const result = await repository.findByOwnerId(testCompanyId);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(p => p.id === createdPortalId)).toBe(true);
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

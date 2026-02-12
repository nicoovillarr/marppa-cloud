import { Test, TestingModule } from '@nestjs/testing';
import { TransponderPrismaRepository } from './transponder.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { TransponderEntity } from '../../domain/entities/transponder.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { PortalType } from '../../domain/enum/portal-type.enum';
import { TransponderMode } from '@prisma/client';

describe('TransponderPrismaRepository (Integration)', () => {
    let repository: TransponderPrismaRepository;
    let prisma: PrismaService;

    const testCompanyId = 'c-test-transponder-integration';
    const testZoneId = 'z-test-transponder-integration';
    const testPortalId = 'p-test-transponder-integration';

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TransponderPrismaRepository, PrismaService],
        }).compile();

        repository = module.get<TransponderPrismaRepository>(TransponderPrismaRepository);
        prisma = module.get<PrismaService>(PrismaService);

        // Clean up previous run if any
        await prisma.transponder.deleteMany({
            where: {
                path: { contains: 'Test Transponder' },
            },
        });
        await prisma.portal.deleteMany({
            where: { id: testPortalId },
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
                name: 'Test Company Transponder Integration',
            }
        });

        // Create test zone
        await prisma.zone.create({
            data: {
                id: testZoneId,
                name: 'Test Zone Transponder Integration',
                cidr: '10.0.0.0/16',
                gateway: '10.0.0.1',
                status: ResourceStatus.ACTIVE,
                createdBy: 'u-000001',
                ownerId: testCompanyId,
            }
        });

        // Create test portal
        await prisma.portal.create({
            data: {
                id: testPortalId,
                name: 'Test Portal Transponder Integration',
                address: '192.168.1.200',
                type: PortalType.CLOUDFLARE,
                apiKey: 'test-api-key-transponder-integration',
                status: ResourceStatus.ACTIVE,
                createdBy: 'u-000001',
                ownerId: testCompanyId,
                zoneId: testZoneId,
            }
        });
    });

    afterAll(async () => {
        await prisma.transponder.deleteMany({
            where: {
                path: { contains: 'Test Transponder' },
            },
        });
        await prisma.portal.delete({
            where: { id: testPortalId },
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
        let createdTransponderId: string;

        it('should create a transponder', async () => {
            const transponder = new TransponderEntity(
                '/Test Transponder Integration',
                8080,
                ResourceStatus.ACTIVE,
                'u-000001',
                testPortalId,
                {
                    mode: TransponderMode.PROXY,
                    cacheEnabled: true,
                    allowCookies: true,
                    gzipEnabled: true,
                    priority: 1,
                    updatedBy: 'u-000001',
                }
            );

            const result = await repository.create(transponder);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.path).toBe('/Test Transponder Integration');
            expect(result.port).toBe(8080);
            expect(result.status).toBe(ResourceStatus.ACTIVE);
            expect(result.portalId).toBe(testPortalId);
            expect(result.mode).toBe(TransponderMode.PROXY);
            createdTransponderId = result.id!;
        });

        it('should find a transponder by portal id and transponder id', async () => {
            const result = await repository.findById(testPortalId, createdTransponderId);

            expect(result).toBeDefined();
            expect(result?.id).toBe(createdTransponderId);
            expect(result?.path).toBe('/Test Transponder Integration');
            expect(result?.portalId).toBe(testPortalId);
        });

        it('should find transponders by portal id', async () => {
            const result = await repository.findByPortalId(testPortalId);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(t => t.id === createdTransponderId)).toBe(true);
        });

        it('should update a transponder', async () => {
            const transponder = await repository.findById(testPortalId, createdTransponderId);
            if (!transponder) throw new Error('Transponder not found');

            const updatedTransponder = transponder.clone({
                port: 9090,
                mode: TransponderMode.REDIRECT,
                cacheEnabled: false,
                priority: 2,
            });

            const result = await repository.update(updatedTransponder);

            expect(result).toBeDefined();
            expect(result.port).toBe(9090);
            expect(result.mode).toBe(TransponderMode.REDIRECT);
            expect(result.cacheEnabled).toBe(false);
            expect(result.priority).toBe(2);
        });

        it('should delete a transponder', async () => {
            await repository.delete(testPortalId, createdTransponderId);

            const result = await repository.findById(testPortalId, createdTransponderId);
            expect(result).toBeNull();
        });
    });
});

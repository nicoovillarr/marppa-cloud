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

    const testCompanyId = 'c-000001';
    let testPortalId;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TransponderPrismaRepository, PrismaService],
        }).compile();

        repository = module.get<TransponderPrismaRepository>(TransponderPrismaRepository);
        prisma = module.get<PrismaService>(PrismaService);

        await prisma.portal.deleteMany({
            where: {
                address: 'integration-test.marppa.cloud'
            },
        });

        const { id: portalId } = await prisma.portal.create({
            data: {
                name: 'Test Portal Transponder Integration',
                address: 'integration-test.marppa.cloud',
                type: PortalType.CLOUDFLARE,
                apiKey: 'test-api-key-transponder-integration',
                status: ResourceStatus.ACTIVE,
                createdBy: 'u-000001',
                ownerId: testCompanyId,
            }
        });

        testPortalId = portalId;
    });

    afterAll(async () => {
        await prisma.transponder.deleteMany({
            where: {
                path: { contains: 'Test Transponder' },
            },
        });

        await prisma.portal.delete({
            where: {
                address: 'integration-test.marppa.cloud'
            },
        });

        await prisma.$disconnect();
    });

    describe('CRUD Operations', () => {
        let createdTransponderId: string;

        it('should create a transponder', async () => {
            const transponder = new TransponderEntity(
                'Test Transponder Integration',
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
            expect(result.path).toBe('Test Transponder Integration');
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
            expect(result?.path).toBe('Test Transponder Integration');
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
                cacheEnabled: false,
                priority: 2,
            });

            const result = await repository.update(updatedTransponder);

            expect(result).toBeDefined();
            expect(result.port).toBe(9090);
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

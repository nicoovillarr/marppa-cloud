import { Test, TestingModule } from '@nestjs/testing';
import { FiberPrismaRepository } from './fiber.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { FiberEntity } from '../../domain/entities/fiber.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('FiberPrismaRepository (Integration)', () => {
    let repository: FiberPrismaRepository;
    let prisma: PrismaService;

    const testCompanyId = 'c-000001';
    let testZoneId, testNodeId;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FiberPrismaRepository, PrismaService],
        }).compile();

        repository = module.get<FiberPrismaRepository>(FiberPrismaRepository);
        prisma = module.get<PrismaService>(PrismaService);

        await prisma.fiber.deleteMany({
            where: { nodeId: testNodeId },
        });

        await prisma.node.deleteMany({
            where: { id: testNodeId },
        });

        await prisma.zone.deleteMany({
            where: { id: testZoneId },
        });

        const { id: zoneId } = await prisma.zone.create({
            data: {
                name: 'Test Zone Fiber Integration',
                cidr: '10.0.0.0/16',
                gateway: '10.0.0.1',
                ownerId: testCompanyId,
                createdBy: 'system',
                updatedBy: 'system',
            }
        });

        const { id: nodeId } = await prisma.node.create({
            data: {
                ipAddress: '10.0.0.10',
                status: 'ACTIVE',
                zoneId: zoneId,
                createdBy: 'system',
                updatedBy: 'system',
            }
        });

        testZoneId = zoneId;
        testNodeId = nodeId;
    });

    afterAll(async () => {
        await prisma.fiber.deleteMany({
            where: {
                nodeId: testNodeId,
            },
        });

        await prisma.node.deleteMany({
            where: { id: testNodeId },
        });

        await prisma.zone.deleteMany({
            where: { id: testZoneId },
        });

        await prisma.$disconnect();
    });

    describe('CRUD Operations', () => {
        let createdFiberId: number;

        it('should create a fiber', async () => {
            const fiber = new FiberEntity(
                'tcp',
                8080,
                ResourceStatus.ACTIVE,
                testNodeId,
                'u-000001',
                {
                    hostPort: 51193,
                }
            );

            const result = await repository.create(fiber);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.protocol).toBe('tcp');
            expect(result.targetPort).toBe(8080);
            expect(result.hostPort).toBe(51193);
            expect(result.nodeId).toBe(testNodeId);

            createdFiberId = result.id!;
        });

        it('should find a fiber by id', async () => {
            const result = await repository.findById(testZoneId, testNodeId, createdFiberId);

            expect(result).toBeDefined();
            expect(result?.id).toBe(createdFiberId);
            expect(result?.protocol).toBe('tcp');
        });

        it('should find fibers by node id', async () => {
            const result = await repository.findByNodeId(testZoneId, testNodeId);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(f => f.id === createdFiberId)).toBe(true);
        });

        it('should delete a fiber', async () => {
            await repository.delete(testZoneId, testNodeId, createdFiberId);

            const result = await repository.findById(testZoneId, testNodeId, createdFiberId);
            expect(result).toBeNull();
        });
    });
});

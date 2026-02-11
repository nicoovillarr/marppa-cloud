import { Test, TestingModule } from '@nestjs/testing';
import { NodePrismaRepository } from './node.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { NodeEntity } from '../../domain/entities/node.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('NodePrismaRepository (Integration)', () => {
    let repository: NodePrismaRepository;
    let prisma: PrismaService;

    const testCompanyId = 'c-test-node-integration';
    const testZoneId = 'z-test-node-integration';

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NodePrismaRepository, PrismaService],
        }).compile();

        repository = module.get<NodePrismaRepository>(NodePrismaRepository);
        prisma = module.get<PrismaService>(PrismaService);

        // Cleanup
        await prisma.node.deleteMany({
            where: { zoneId: testZoneId },
        });
        await prisma.zone.deleteMany({
            where: { id: testZoneId },
        });
        await prisma.company.deleteMany({
            where: { id: testCompanyId },
        });

        // Create prerequisites
        await prisma.company.create({
            data: {
                id: testCompanyId,
                name: 'Test Company Node Integration',
            }
        });

        await prisma.zone.create({
            data: {
                id: testZoneId,
                name: 'Test Zone Node Integration',
                cidr: '10.0.0.0/16',
                gateway: '10.0.0.1',
                ownerId: testCompanyId,
                createdBy: 'system',
                updatedBy: 'system',
            }
        });
    });

    afterAll(async () => {
        await prisma.node.deleteMany({
            where: {
                zoneId: testZoneId,
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
        let createdNodeId: string;

        it('should create a node', async () => {
            const node = new NodeEntity(
                '10.0.0.5',
                ResourceStatus.ACTIVE,
                testZoneId,
                'u-000001',
                {
                    workerId: undefined,
                    atomId: undefined,
                    updatedBy: 'u-000001',
                }
            );

            const result = await repository.create(node);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.ipAddress).toBe('10.0.0.5');
            expect(result.zoneId).toBe(testZoneId);
            createdNodeId = result.id!;
        });

        it('should find a node by id', async () => {
            const result = await repository.findById(testZoneId, createdNodeId);

            expect(result).toBeDefined();
            expect(result?.id).toBe(createdNodeId);
            expect(result?.ipAddress).toBe('10.0.0.5');
        });

        it('should find nodes by zone id', async () => {
            const result = await repository.findByZoneId(testZoneId);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(n => n.id === createdNodeId)).toBe(true);
        });

        it('should delete a node', async () => {
            await repository.delete(testZoneId, createdNodeId);

            const result = await repository.findById(testZoneId, createdNodeId);
            expect(result).toBeNull();
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ZonePrismaRepository } from './zone.prisma-repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { ZoneEntity } from '../../domain/entities/zone.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('ZonePrismaRepository (Integration)', () => {
    let repository: ZonePrismaRepository;
    let prisma: PrismaService;

    const testCompanyId = 'c-test-zone-integration';

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ZonePrismaRepository, PrismaService],
        }).compile();

        repository = module.get<ZonePrismaRepository>(ZonePrismaRepository);
        prisma = module.get<PrismaService>(PrismaService);

        // Clean up passed run if any
        await prisma.zone.deleteMany({
            where: {
                name: { contains: 'Test Zone' },
            },
        });
        // We need to delete by ID to be safe or just use upsert. 
        // But delete is safer to start clean.
        await prisma.company.deleteMany({
            where: { id: testCompanyId },
        });

        // Create a test company
        await prisma.company.create({
            data: {
                id: testCompanyId,
                name: 'Test Company Zone Integration',
            }
        });
    });

    afterAll(async () => {
        await prisma.zone.deleteMany({
            where: {
                name: { contains: 'Test Zone' },
            },
        });
        await prisma.company.delete({
            where: { id: testCompanyId },
        });
        await prisma.$disconnect();
    });

    describe('CRUD Operations', () => {
        let createdZoneId: string;

        it('should create a zone', async () => {
            const zone = new ZoneEntity(
                'Test Zone Integration',
                ResourceStatus.ACTIVE,
                '10.0.0.0/16',
                '10.0.0.1',
                'u-000001',
                testCompanyId,
                {
                    description: 'Test Description',
                    updatedBy: 'u-000001',
                }
            );

            const result = await repository.create(zone);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.name).toBe('Test Zone Integration');
            expect(result.cidr).toBe('10.0.0.0/16');
            expect(result.gateway).toBe('10.0.0.1');
            expect(result.ownerId).toBe(testCompanyId);
            createdZoneId = result.id!;
        });

        it('should find a zone by id', async () => {
            const result = await repository.findById(createdZoneId);

            expect(result).toBeDefined();
            expect(result?.id).toBe(createdZoneId);
            expect(result?.name).toBe('Test Zone Integration');
        });

        it('should find a zone with nodes by id', async () => {
            const result = await repository.findWithNodesById(createdZoneId);

            expect(result).toBeDefined();
            expect(result?.zone.id).toBe(createdZoneId);
            expect(result?.nodes).toEqual([]);
        });

        it('should find zones by owner id', async () => {
            const result = await repository.findByOwnerId(testCompanyId);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(z => z.id === createdZoneId)).toBe(true);
        });

        it('should update a zone', async () => {
            const zone = await repository.findById(createdZoneId);
            if (!zone) throw new Error('Zone not found');

            const updatedZone = zone.clone({
                description: 'Updated Description',
            });

            const result = await repository.update(updatedZone);

            expect(result).toBeDefined();
            expect(result.description).toBe('Updated Description');
        });

        it('should delete a zone', async () => {
            await repository.delete(createdZoneId);

            const result = await repository.findById(createdZoneId);
            expect(result).toBeNull();
        });
    });
});

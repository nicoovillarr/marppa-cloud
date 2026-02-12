import { Test, TestingModule } from '@nestjs/testing';
import { PortalService } from './portal.service';
import { PortalRepository, PORTAL_REPOSITORY } from '../repositories/portal.repository';
import { PortalEntity } from '../entities/portal.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreatePortalDto } from '../../presentation/dtos/create-portal.dto';
import { UpdatePortalDto } from '../../presentation/dtos/update-portal.dto';
import { PortalType } from '../enum/portal-type.enum';
import * as SessionContext from '@/auth/infrastructure/als/session.context';

describe('PortalService', () => {
    let service: PortalService;
    let repository: PortalRepository;

    const mockPortalEntity = new PortalEntity(
        'Test Portal',
        '192.168.1.1',
        PortalType.CLOUDFLARE,
        'test-api-key-123',
        ResourceStatus.ACTIVE,
        'u-000001',
        'c-000001',
        {
            description: 'Test Description',
            id: 'p-000001',
            listenHttp: true,
            listenHttps: true,
            enableCompression: true,
            cacheEnabled: true,
            corsEnabled: true,
            defaultServer: false,
            zoneId: 'z-000001',
            updatedBy: 'u-000001',
        }
    );

    const mockPortalRepository = {
        findById: jest.fn(),
        findByOwnerId: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortalService,
                {
                    provide: PORTAL_REPOSITORY,
                    useValue: mockPortalRepository,
                },
            ],
        }).compile();

        service = module.get<PortalService>(PortalService);
        repository = module.get<PortalRepository>(PORTAL_REPOSITORY);

        jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue({
            userId: 'u-000001',
            companyId: 'c-000001',
            email: 'test@test.com',
            type: 'access'
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should return a portal by id', async () => {
            mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);

            const result = await service.findById('p-000001');

            expect(repository.findById).toHaveBeenCalledWith('p-000001');
            expect(result).toEqual(mockPortalEntity);
        });

        it('should return null if portal not found', async () => {
            mockPortalRepository.findById.mockResolvedValue(null);

            const result = await service.findById('p-999999');

            expect(repository.findById).toHaveBeenCalledWith('p-999999');
            expect(result).toBeNull();
        });
    });

    describe('findByOwnerId', () => {
        it('should return portals by owner id', async () => {
            mockPortalRepository.findByOwnerId.mockResolvedValue([mockPortalEntity]);

            const result = await service.findByOwnerId('c-000001');

            expect(repository.findByOwnerId).toHaveBeenCalledWith('c-000001');
            expect(result).toEqual([mockPortalEntity]);
        });
    });

    describe('create', () => {
        const createDto: CreatePortalDto = {
            name: 'New Portal',
            description: 'New Description',
            address: '192.168.1.2',
            type: PortalType.DYNU,
            apiKey: 'new-api-key-456',
            listenHttp: true,
            listenHttps: false,
            enableCompression: false,
            cacheEnabled: true,
            corsEnabled: false,
            defaultServer: true,
            zoneId: 'z-000002',
        };

        it('should create a portal successfully', async () => {
            mockPortalRepository.create.mockResolvedValue(mockPortalEntity);

            const result = await service.create(createDto);

            expect(repository.create).toHaveBeenCalledWith(expect.any(PortalEntity));
            expect(result).toEqual(mockPortalEntity);
        });

        it('should throw UnauthorizedError if no user in session', async () => {
            jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

            expect(() => service.create(createDto)).toThrow(UnauthorizedError);
        });
    });

    describe('update', () => {
        const updateDto: UpdatePortalDto = {
            name: 'Updated Portal',
            address: '192.168.1.1',
            type: PortalType.CLOUDFLARE,
            apiKey: 'api-key',
            description: 'Updated Description',
            listenHttp: false,
            listenHttps: true,
            enableCompression: true,
            cacheEnabled: false,
            corsEnabled: true,
            defaultServer: false,
            zoneId: 'z-000003',
        };

        it('should update a portal successfully', async () => {
            mockPortalRepository.findById.mockResolvedValue(mockPortalEntity);
            mockPortalRepository.update.mockResolvedValue(mockPortalEntity);

            const result = await service.update('p-000001', updateDto);

            expect(repository.findById).toHaveBeenCalledWith('p-000001');
            expect(repository.update).toHaveBeenCalledWith(expect.any(PortalEntity));
            expect(result).toEqual(mockPortalEntity);
        });

        it('should throw UnauthorizedError if no user in session', async () => {
            jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

            await expect(service.update('p-000001', updateDto)).rejects.toThrow(UnauthorizedError);
        });

        it('should throw NotFoundError if portal not found', async () => {
            mockPortalRepository.findById.mockResolvedValue(null);

            await expect(service.update('p-999999', updateDto)).rejects.toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete a portal', async () => {
            mockPortalRepository.delete.mockResolvedValue(undefined);

            await service.delete('p-000001');

            expect(repository.delete).toHaveBeenCalledWith('p-000001');
        });
    });
});

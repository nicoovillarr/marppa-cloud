import { Test, TestingModule } from '@nestjs/testing';
import { TransponderService } from './transponder.service';
import { TransponderRepository, TRANSPONDER_REPOSITORY } from '../repositories/transponder.repository';
import { TransponderEntity } from '../entities/transponder.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { CreateTransponderDto } from '../../presentation/dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../../presentation/dtos/update-transponder.dto';
import * as SessionContext from '@/auth/infrastructure/als/session.context';
import { TransponderMode } from '../enum/transponder-mode.enum';

describe('TransponderService', () => {
    let service: TransponderService;
    let repository: TransponderRepository;

    const mockTransponderEntity = new TransponderEntity(
        '/api/v1',
        8080,
        ResourceStatus.ACTIVE,
        'u-000001',
        'p-000001',
        {
            id: 't-000001',
            mode: TransponderMode.PROXY,
            cacheEnabled: true,
            allowCookies: true,
            gzipEnabled: true,
            priority: 1,
            updatedBy: 'u-000001',
            nodeId: 'n-000001',
        }
    );

    const mockTransponderRepository = {
        findById: jest.fn(),
        findByPortalId: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransponderService,
                {
                    provide: TRANSPONDER_REPOSITORY,
                    useValue: mockTransponderRepository,
                },
            ],
        }).compile();

        service = module.get<TransponderService>(TransponderService);
        repository = module.get<TransponderRepository>(TRANSPONDER_REPOSITORY);

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
        it('should return a transponder by portal id and transponder id', async () => {
            mockTransponderRepository.findById.mockResolvedValue(mockTransponderEntity);

            const result = await service.findById('p-000001', 't-000001');

            expect(repository.findById).toHaveBeenCalledWith('p-000001', 't-000001');
            expect(result).toEqual(mockTransponderEntity);
        });

        it('should return null if transponder not found', async () => {
            mockTransponderRepository.findById.mockResolvedValue(null);

            const result = await service.findById('p-000001', 't-999999');

            expect(repository.findById).toHaveBeenCalledWith('p-000001', 't-999999');
            expect(result).toBeNull();
        });
    });

    describe('findByPortalId', () => {
        it('should return transponders by portal id', async () => {
            mockTransponderRepository.findByPortalId.mockResolvedValue([mockTransponderEntity]);

            const result = await service.findByPortalId('p-000001');

            expect(repository.findByPortalId).toHaveBeenCalledWith('p-000001');
            expect(result).toEqual([mockTransponderEntity]);
        });
    });

    describe('create', () => {
        const createDto: CreateTransponderDto = {
            path: '/api/v2',
            port: 9090,
            mode: TransponderMode.PROXY,
            cacheEnabled: false,
            allowCookies: false,
            gzipEnabled: false,
            priority: 2,
            nodeId: 'n-000002',
        };

        it('should create a transponder successfully', async () => {
            mockTransponderRepository.create.mockResolvedValue(mockTransponderEntity);

            const result = await service.create('p-000001', createDto);

            expect(repository.create).toHaveBeenCalledWith(expect.any(TransponderEntity));
            expect(result).toEqual(mockTransponderEntity);
        });

        it('should throw UnauthorizedError if no user in session', async () => {
            jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

            expect(() => service.create('p-000001', createDto)).toThrow(UnauthorizedError);
        });
    });

    describe('update', () => {
        const updateDto: UpdateTransponderDto = {
            path: '/api/v3',
            port: 7070,
            mode: TransponderMode.PROXY,
            cacheEnabled: true,
            allowCookies: true,
            gzipEnabled: true,
            priority: 3,
            nodeId: 'n-000001',
        };

        it('should update a transponder successfully', async () => {
            mockTransponderRepository.findById.mockResolvedValue(mockTransponderEntity);
            mockTransponderRepository.update.mockResolvedValue(mockTransponderEntity);

            const result = await service.update('p-000001', 't-000001', updateDto);

            expect(repository.findById).toHaveBeenCalledWith('p-000001', 't-000001');
            expect(repository.update).toHaveBeenCalledWith(expect.any(TransponderEntity));
            expect(result).toEqual(mockTransponderEntity);
        });

        it('should throw UnauthorizedError if no user in session', async () => {
            jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue(null);

            await expect(service.update('p-000001', 't-000001', updateDto)).rejects.toThrow(UnauthorizedError);
        });

        it('should throw NotFoundError if transponder not found', async () => {
            mockTransponderRepository.findById.mockResolvedValue(null);

            await expect(service.update('p-000001', 't-999999', updateDto)).rejects.toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete a transponder', async () => {
            mockTransponderRepository.delete.mockResolvedValue(undefined);

            await service.delete('p-000001', 't-000001');

            expect(repository.delete).toHaveBeenCalledWith('p-000001', 't-000001');
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import {
  EventRepository,
  EVENT_REPOSITORY_SYMBOL,
} from '../repositories/event.repository';
import { EventEntity } from '../entities/event.entity';
import { EventResourceEntity } from '../entities/event-resource.entity';
import { EventPropertyEntity } from '../entities/event-property.entity';
import { EventWithRelationsModel } from '../models/event-with-relations.model';
import { EventTypeKey } from '../enums/event-type-key.enum';
import { CreateEventDto } from '@/event/presentation/dtos/create-event.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';

describe('EventService', () => {
  let service: EventService;
  let repository: EventRepository;

  const mockEvent: EventEntity = new EventEntity(
    EventTypeKey.SYSTEM_TEST_EVENT,
    'u-000001',
    'c-000001',
    {
      id: 1,
      notes: 'Test event',
      data: { key: 'value' },
      retries: 0,
      isVisible: true,
    },
  );

  const mockEventResource: EventResourceEntity = new EventResourceEntity(
    1,
    'WORKER',
    'w-000001',
  );

  const mockEventProperty: EventPropertyEntity = new EventPropertyEntity(
    1,
    'status',
    'active',
  );

  const mockEventWithRelations: EventWithRelationsModel =
    new EventWithRelationsModel({
      event: mockEvent,
      resources: [mockEventResource],
      properties: [mockEventProperty],
    });

  const mockEventRepository = {
    create: jest.fn(),
    addEventResource: jest.fn(),
    addEventProperty: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: EVENT_REPOSITORY_SYMBOL,
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    repository = module.get<EventRepository>(EVENT_REPOSITORY_SYMBOL);

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an event', async () => {
      mockEventRepository.create.mockResolvedValue(mockEvent);

      const dto: CreateEventDto = {
        type: EventTypeKey.SYSTEM_TEST_EVENT,
        notes: 'Test event',
        data: { key: 'value' },
      };

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.any(EventEntity));
      expect(result).toEqual(mockEvent);
    });

    it('should derive createdBy/companyId from the session, ignoring any client-supplied values', async () => {
      mockEventRepository.create.mockResolvedValue(mockEvent);

      await service.create({
        type: EventTypeKey.SYSTEM_TEST_EVENT,
      } as CreateEventDto);

      const eventArg = (repository.create as jest.Mock).mock.calls[0][0];
      expect(eventArg.createdBy).toBe('u-000001');
      expect(eventArg.companyId).toBe('c-000001');
    });

    it('should throw UnauthorizedError if there is no session', async () => {
      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(
        service.create({ type: EventTypeKey.SYSTEM_TEST_EVENT }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('addEventResource', () => {
    it('should add a resource to an event', async () => {
      mockEventRepository.addEventResource.mockResolvedValue(mockEventResource);

      const result = await service.addEventResource(1, 'WORKER', 'worker-123');

      expect(repository.addEventResource).toHaveBeenCalledWith(
        1,
        expect.any(EventResourceEntity),
      );
      expect(result).toEqual(mockEventResource);
    });
  });

  describe('addEventProperty', () => {
    it('should add a property to an event', async () => {
      mockEventRepository.addEventProperty.mockResolvedValue(mockEventProperty);

      const result = await service.addEventProperty(1, 'status', 'active');

      expect(repository.addEventProperty).toHaveBeenCalledWith(
        1,
        expect.any(EventPropertyEntity),
      );
      expect(result).toEqual(mockEventProperty);
    });
  });

  describe('findById', () => {
    it('should return an event with relations by id', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEventWithRelations);

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEventWithRelations);
    });

    it('should return null if event not found', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(repository.findById).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it('should throw when the event belongs to another company', async () => {
      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000002',
        companyId: 'c-other',
        email: 'test@test.com',
        type: 'access',
      } as any);
      mockEventRepository.findById.mockResolvedValue(mockEventWithRelations);

      await expect(service.findById(1)).rejects.toThrow();
    });
  });

  describe('findMany', () => {
    it('should scope the query to the caller company', async () => {
      mockEventRepository.findMany.mockResolvedValue([mockEvent]);

      const result = await service.findMany();

      expect(repository.findMany).toHaveBeenCalledWith('c-000001');
      expect(result).toEqual([mockEvent]);
    });

    it('should throw UnauthorizedError if there is no session', async () => {
      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.findMany()).rejects.toThrow(UnauthorizedError);
    });
  });
});

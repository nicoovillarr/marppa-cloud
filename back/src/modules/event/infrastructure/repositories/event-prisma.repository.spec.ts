import { Test, TestingModule } from '@nestjs/testing';
import { EventPrismaRepository } from './event-prisma.repository';
import { PrismaClient } from '@prisma/client';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventResourceEntity } from '../../domain/entities/event-resource.entity';
import { EventPropertyEntity } from '../../domain/entities/event-property.entity';

describe('EventPrismaRepository (Integration)', () => {
  const eventTypeKey = 'SYSTEM_TEST_EVENT';
  const userId = 'u-000001';
  const companyId = 'c-000001';
  const workerId = 'w-000001';

  let repository: EventPrismaRepository;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventPrismaRepository, PrismaClient],
    }).compile();

    repository = module.get<EventPrismaRepository>(EventPrismaRepository);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  afterAll(async () => {
    await prisma.eventProperty.deleteMany({
      where: {
        event: {
          type: { contains: eventTypeKey },
        },
      },
    });
    await prisma.eventResource.deleteMany({
      where: {
        event: {
          type: { contains: eventTypeKey },
        },
      },
    });
    await prisma.event.deleteMany({
      where: {
        type: { contains: eventTypeKey },
      },
    });
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    let createdEventId: number;

    it('should create an event', async () => {
      const event = new EventEntity(
        eventTypeKey,
        userId,
        companyId,
        {
          notes: 'Integration test event',
          data: { test: true },
          isVisible: false,
        }
      );

      const result = await repository.create(event);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(eventTypeKey);
      expect(result.createdBy).toBe(userId);
      createdEventId = result.id!;
    });

    it('should add a resource to an event', async () => {
      const resource = new EventResourceEntity(
        createdEventId,
        'WORKER',
        workerId
      );

      const result = await repository.addEventResourse(createdEventId, resource);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.eventId).toBe(createdEventId);
      expect(result.resourceType).toBe('WORKER');
      expect(result.resourceId).toBe(workerId);
    });

    it('should add a property to an event', async () => {
      const property = new EventPropertyEntity(
        createdEventId,
        'test-key',
        'test-value'
      );

      const result = await repository.addEventProperty(createdEventId, property);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.eventId).toBe(createdEventId);
      expect(result.key).toBe('test-key');
      expect(result.value).toBe('test-value');
    });

    it('should find an event with resources and properties', async () => {
      const result = await repository.findById(createdEventId);

      expect(result).toBeDefined();
      expect(result?.event.id).toBe(createdEventId);
      expect(result?.event.type).toBe(eventTypeKey);
      expect(result?.resources).toHaveLength(1);
      expect(result?.resources[0].resourceType).toBe('WORKER');
      expect(result?.properties).toHaveLength(1);
      expect(result?.properties[0].key).toBe('test-key');
    });

    it('should return null for non-existent event', async () => {
      const result = await repository.findById(999999);

      expect(result).toBeNull();
    });

    it('should find all events', async () => {
      const result = await repository.findMany();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      const found = result.find(e => e.id === createdEventId);
      expect(found).toBeDefined();
      expect(found?.type).toBe(eventTypeKey);
    });
  });
});

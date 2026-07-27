import { Test, TestingModule } from '@nestjs/testing';
import { ZoneApiService } from './zone.api-service';
import { ZoneService } from '../../domain/services/zone.service';
import { NetmaskService } from '../../domain/services/netmask.service';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { ZoneEntity } from '../../domain/entities/zone.entity';
import { NodeEntity } from '../../domain/entities/node.entity';
import { NodeWithFibersModel } from '../../domain/models/node-with-fibers.model';
import { ZoneWithNodesAndFibersModel } from '../../domain/models/zone-with-nodes-and-fibers.model';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('ZoneApiService', () => {
  let service: ZoneApiService;

  const zone = new ZoneEntity(
    'Test Zone',
    ResourceStatus.ACTIVE,
    '10.0.0.0/16',
    '10.0.0.1',
    'u-000001',
    'c-000001',
    { id: 'z-000001' },
  );

  const node = new NodeEntity(
    '10.0.0.3',
    ResourceStatus.ACTIVE,
    'z-000001',
    'u-000001',
    { id: 'n-000001', workerId: 'w-000001' },
  );

  const mockZoneService = {
    findByOwnerId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoneApiService,
        { provide: ZoneService, useValue: mockZoneService },
        { provide: NetmaskService, useValue: {} },
        { provide: EventDispatchService, useValue: { dispatch: jest.fn() } },
      ],
    }).compile();

    service = module.get<ZoneApiService>(ZoneApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByOwnerId', () => {
    it('should unwrap each node out of its NodeWithFibersModel', async () => {
      mockZoneService.findByOwnerId.mockResolvedValue([
        new ZoneWithNodesAndFibersModel(zone, [
          new NodeWithFibersModel(node, []),
        ]),
      ]);

      const [result] = await service.findByOwnerId();

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toEqual(
        expect.objectContaining({
          id: 'n-000001',
          ipAddress: '10.0.0.3',
          zoneId: 'z-000001',
        }),
      );
    });
  });
});

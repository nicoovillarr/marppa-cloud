import { Test, TestingModule } from '@nestjs/testing';
import { WorkerApiService } from './worker.api-service';
import { WorkerService } from '@/hive/domain/services/worker.service';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { WORKER_SSH_KEY_REPOSITORY_SYMBOL } from '@/hive/domain/repositories/worker-ssh-key.repository';
import { CreateWorkerDto } from '@/hive/presentation/dtos/create-worker.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';

const PUBLIC_SSH = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample nico@laptop';

describe('WorkerApiService', () => {
  let service: WorkerApiService;

  const mockWorkerService = { createWorker: jest.fn() };
  const mockEventDispatch = { dispatch: jest.fn() };
  const mockSshKeyRepository = { create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerApiService,
        { provide: WorkerService, useValue: mockWorkerService },
        { provide: EventDispatchService, useValue: mockEventDispatch },
        {
          provide: WORKER_SSH_KEY_REPOSITORY_SYMBOL,
          useValue: mockSshKeyRepository,
        },
      ],
    }).compile();

    service = module.get<WorkerApiService>(WorkerApiService);

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
    } as any);

    mockWorkerService.createWorker.mockResolvedValue({
      id: 'w-000001',
      name: 'web-01',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const dto = {
    name: 'web-01',
    imageId: 1,
    flavorId: 1,
    publicSSH: PUBLIC_SSH,
  } as CreateWorkerDto;

  it('stores the bootstrap key so a later key update cannot wipe it', async () => {
    await service.create(dto);

    expect(mockSshKeyRepository.create).toHaveBeenCalledWith(
      'w-000001',
      'bootstrap',
      PUBLIC_SSH,
      'u-000001',
    );
  });

  it('still bakes the same key into cloud-init', async () => {
    await service.create(dto);

    expect(mockEventDispatch.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        primary: { type: 'Worker', id: 'w-000001' },
        properties: { PublicSSH: PUBLIC_SSH },
      }),
    );
  });

  it('stores the key before the worker is provisioned', async () => {
    const order: string[] = [];
    mockSshKeyRepository.create.mockImplementation(async () => {
      order.push('ssh-key');
    });
    mockEventDispatch.dispatch.mockImplementation(async () => {
      order.push('dispatch');
    });

    await service.create(dto);

    expect(order).toEqual(['ssh-key', 'dispatch']);
  });
});

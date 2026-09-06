import { Test, TestingModule } from '@nestjs/testing';
import { AtomVolumeService } from './atom-volume.service';
import {
  AtomVolumeRepository,
  ATOM_VOLUME_REPOSITORY_SYMBOL,
} from '../repositories/atom-volume.repository';
import { AtomVolumeEntity } from '../entities/atom-volume.entity';
import { AtomEntity } from '../entities/atom.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateAtomVolumeDto } from '@/nucleus/presentation/dtos/create-atom-volume.dto';
import * as sessionContext from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { AtomService } from './atom.service';
import { AtomImageService } from './atom-image.service';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { AtomInvalidStatusError } from '../errors/atom-invalid-status.error';
import { AtomVolumeInvalidStatusError } from '../errors/atom-volume-invalid-status.error';
import { AtomVolumeForbiddenMountPointError } from '../errors/atom-volume-forbidden-mount-point.error';
import { AtomVolumeMountPointTakenError } from '../errors/atom-volume-mount-point-taken.error';
import { AtomVolumeUndeclaredMountPointError } from '../errors/atom-volume-undeclared-mount-point.error';
import {
  AtomVolumeAlreadyAttachedError,
  AtomVolumeNotAttachedError,
  AtomVolumeStillAttachedError,
} from '../errors/atom-volume-attachment.error';

describe('AtomVolumeService', () => {
  let service: AtomVolumeService;
  let repository: AtomVolumeRepository;

  const volumeWith = (
    overrides: {
      status?: ResourceStatus;
      atomId?: string;
      mountPoint?: string;
    } = {},
  ): AtomVolumeEntity =>
    new AtomVolumeEntity(
      'Test Volume',
      overrides.status ?? ResourceStatus.INACTIVE,
      1,
      'c-000001',
      'u-000001',
      {
        id: 1,
        mountPoint: overrides.mountPoint ?? null,
        hostPath: '/var/lib/marppa/atom-volumes/1',
        atomId: overrides.atomId,
      },
    );

  const atomWith = (status: ResourceStatus): AtomEntity =>
    ({ id: 'a-000001', status, ownerId: 'c-000001' }) as AtomEntity;

  const mockAtomVolumeRepository = {
    findById: jest.fn(),
    findByOwnerIds: jest.fn(),
    findByAtomId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAtomService = { findById: jest.fn() };
  const mockAtomImageService = { findById: jest.fn() };
  const mockCompanyHierarchyService = { selfAndDescendants: jest.fn() };
  const mockHostCapacityService = { assertFitsOnCreate: jest.fn() };

  const savedVolume = (): AtomVolumeEntity =>
    (repository.update as jest.Mock).mock.calls[0][0];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtomVolumeService,
        {
          provide: ATOM_VOLUME_REPOSITORY_SYMBOL,
          useValue: mockAtomVolumeRepository,
        },
        { provide: AtomService, useValue: mockAtomService },
        { provide: AtomImageService, useValue: mockAtomImageService },
        {
          provide: CompanyHierarchyService,
          useValue: mockCompanyHierarchyService,
        },
        { provide: HostCapacityService, useValue: mockHostCapacityService },
      ],
    }).compile();

    service = module.get<AtomVolumeService>(AtomVolumeService);
    repository = module.get<AtomVolumeRepository>(
      ATOM_VOLUME_REPOSITORY_SYMBOL,
    );

    jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      role: 'OWNER',
    } as any);

    mockCompanyHierarchyService.selfAndDescendants.mockResolvedValue([
      'c-000001',
    ]);
    mockHostCapacityService.assertFitsOnCreate.mockResolvedValue(undefined);
    mockAtomVolumeRepository.findByAtomId.mockResolvedValue([]);
    mockAtomVolumeRepository.update.mockImplementation((e) => e);
    mockAtomImageService.findById.mockResolvedValue({
      name: 'redis-7',
      dataPaths: ['/data', '/etc/wireguard'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns a volume by id', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result.name).toBe('Test Volume');
    });

    it('throws NotFoundError when the volume does not exist', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByOwnerId', () => {
    it('scopes the listing to the readable companies', async () => {
      mockAtomVolumeRepository.findByOwnerIds.mockResolvedValue([volumeWith()]);

      const result = await service.findByOwnerId();

      expect(repository.findByOwnerIds).toHaveBeenCalledWith(['c-000001']);
      expect(result).toHaveLength(1);
    });

    it('rejects an owner outside the hierarchy', async () => {
      await expect(service.findByOwnerId('c-999999')).rejects.toThrow();
    });
  });

  describe('create', () => {
    const dto: CreateAtomVolumeDto = {
      name: 'New Volume',
      sizeGiB: 2,
      ownerId: 'c-000001',
    };

    it('creates the volume QUEUED and unattached', async () => {
      mockAtomVolumeRepository.create.mockImplementation((e) => e);

      const result = await service.create(dto);

      expect(mockHostCapacityService.assertFitsOnCreate).toHaveBeenCalledWith({
        cpuCores: 0,
        ramMB: 0,
        diskGB: 2,
      });
      expect(result.status).toBe(ResourceStatus.QUEUED);
      expect(result.atomId).toBeUndefined();
      expect(result.hostPath).toBeUndefined();
    });

    it('leaves the mount point unset until the volume is attached', async () => {
      mockAtomVolumeRepository.create.mockImplementation((e) => e);

      const result = await service.create(dto);

      expect(result.mountPoint).toBeNull();
    });
  });

  describe('attach', () => {
    it('links the volume to the atom without queueing host work', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await service.attach(1, 'a-000001', '/data');

      expect(savedVolume().atomId).toBe('a-000001');
      expect(savedVolume().status).toBe(ResourceStatus.INACTIVE);
    });

    it('refuses a volume that is already attached', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(
        volumeWith({ atomId: 'a-000002' }),
      );
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await expect(service.attach(1, 'a-000001', '/data')).rejects.toThrow(
        AtomVolumeAlreadyAttachedError,
      );
    });

    it('refuses a running atom', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.ACTIVE),
      );

      await expect(service.attach(1, 'a-000001', '/data')).rejects.toThrow(
        AtomInvalidStatusError,
      );
    });

    it('refuses a volume the host has not provisioned yet', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(
        volumeWith({ status: ResourceStatus.QUEUED }),
      );
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await expect(service.attach(1, 'a-000001', '/data')).rejects.toThrow(
        AtomVolumeInvalidStatusError,
      );
    });

    it('refuses a mount point the atom already uses', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );
      mockAtomVolumeRepository.findByAtomId.mockResolvedValue([
        volumeWith({ atomId: 'a-000001', mountPoint: '/data' }),
      ]);

      await expect(service.attach(1, 'a-000001', '/data')).rejects.toThrow(
        AtomVolumeMountPointTakenError,
      );
    });

    it('accepts any path the image declares as a data path', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await service.attach(1, 'a-000001', '/etc/wireguard');

      expect(savedVolume().mountPoint).toBe('/etc/wireguard');
    });

    it('refuses a path the image does not keep state in', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await expect(
        service.attach(1, 'a-000001', '/var/lib/postgresql/data'),
      ).rejects.toThrow(AtomVolumeUndeclaredMountPointError);
    });

    it('refuses a mount point that would shadow a kernel filesystem', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await expect(service.attach(1, 'a-000001', '/proc/self')).rejects.toThrow(
        AtomVolumeForbiddenMountPointError,
      );
    });

    it('refuses a mount point that escapes through a parent segment', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await expect(
        service.attach(1, 'a-000001', '/data/../etc'),
      ).rejects.toThrow(AtomVolumeForbiddenMountPointError);
    });
  });

  describe('detach', () => {
    it('clears the atom the volume was attached to', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(
        volumeWith({ atomId: 'a-000001' }),
      );
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.INACTIVE),
      );

      await service.detach(1);

      expect(savedVolume().atomId).toBeNull();
    });

    it('refuses while the atom is running', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(
        volumeWith({ atomId: 'a-000001' }),
      );
      mockAtomService.findById.mockResolvedValue(
        atomWith(ResourceStatus.ACTIVE),
      );

      await expect(service.detach(1)).rejects.toThrow(AtomInvalidStatusError);
    });

    it('refuses a volume that is not attached to anything', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());

      await expect(service.detach(1)).rejects.toThrow(
        AtomVolumeNotAttachedError,
      );
    });
  });

  describe('delete', () => {
    it('queues the delete of a detached volume', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(volumeWith());

      await service.delete(1);

      expect(savedVolume().status).toBe(ResourceStatus.QUEUED);
    });

    it('refuses a volume still attached to an atom', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(
        volumeWith({ atomId: 'a-000001' }),
      );

      await expect(service.delete(1)).rejects.toThrow(
        AtomVolumeStillAttachedError,
      );
    });

    it('refuses a volume that is still provisioning', async () => {
      mockAtomVolumeRepository.findById.mockResolvedValue(
        volumeWith({ status: ResourceStatus.PROVISIONING }),
      );

      await expect(service.delete(1)).rejects.toThrow(
        AtomVolumeInvalidStatusError,
      );
    });
  });
});

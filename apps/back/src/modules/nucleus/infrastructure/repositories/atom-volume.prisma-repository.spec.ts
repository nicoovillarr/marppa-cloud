import { AtomVolumePrismaRepository } from './atom-volume.prisma-repository';
import { AtomVolumeEntity } from '@/nucleus/domain/entities/atom-volume.entity';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

describe('AtomVolumePrismaRepository', () => {
  const row = {
    id: 1,
    name: 'cache data',
    status: ResourceStatus.INACTIVE,
    sizeGiB: 1,
    hostPath: '/var/lib/marppa/atom-volumes/1',
    mountPoint: '/data',
    ownerId: 'c-000001',
    atomId: null,
    createdAt: new Date(),
    createdBy: 'u-000001',
    updatedAt: new Date(),
    updatedBy: 'u-000001',
  };

  const update = jest.fn().mockResolvedValue(row);
  const prisma = { atomVolume: { update } } as unknown as PrismaService;
  const repository = new AtomVolumePrismaRepository(prisma);

  const volumeWith = (atomId?: string | null): AtomVolumeEntity =>
    new AtomVolumeEntity(
      'cache data',
      ResourceStatus.INACTIVE,
      1,
      '/data',
      'c-000001',
      'u-000001',
      { id: 1, atomId },
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disconnects the atom when the volume is detached', async () => {
    await repository.update(volumeWith(null));

    expect(update.mock.calls[0][0].data.atom).toEqual({ disconnect: true });
  });

  it('connects the atom when the volume is attached', async () => {
    await repository.update(volumeWith('a-000001'));

    expect(update.mock.calls[0][0].data.atom).toEqual({
      connect: { id: 'a-000001' },
    });
  });
});

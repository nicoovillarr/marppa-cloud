import { Inject, Injectable } from '@nestjs/common';
import {
  EventTypeKey,
  getEventStateTransition,
  isForbiddenAtomMountPoint,
} from '@marppa-cloud/api-types';
import {
  ATOM_VOLUME_REPOSITORY_SYMBOL,
  AtomVolumeRepository,
} from '../repositories/atom-volume.repository';
import { AtomVolumeEntity } from '../entities/atom-volume.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateAtomVolumeDto } from '@/nucleus/presentation/dtos/create-atom-volume.dto';
import { UpdateAtomVolumeDto } from '@/nucleus/presentation/dtos/update-atom-volume.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { authorize } from '@/shared/domain/policy/authorize';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { AtomService } from './atom.service';
import { AtomEntity } from '../entities/atom.entity';
import { AtomInvalidStatusError } from '../errors/atom-invalid-status.error';
import { AtomVolumeInvalidStatusError } from '../errors/atom-volume-invalid-status.error';
import {
  AtomVolumeAlreadyAttachedError,
  AtomVolumeNotAttachedError,
  AtomVolumeStillAttachedError,
} from '../errors/atom-volume-attachment.error';
import { AtomVolumeForbiddenMountPointError } from '../errors/atom-volume-forbidden-mount-point.error';
import { AtomVolumeMountPointTakenError } from '../errors/atom-volume-mount-point-taken.error';

const DELETABLE_STATUSES = [ResourceStatus.INACTIVE, ResourceStatus.FAILED];

@Injectable()
export class AtomVolumeService {
  constructor(
    @Inject(ATOM_VOLUME_REPOSITORY_SYMBOL)
    private readonly atomVolumeRepository: AtomVolumeRepository,

    private readonly atomService: AtomService,
    private readonly companyHierarchyService: CompanyHierarchyService,
    private readonly hostCapacityService: HostCapacityService,
  ) { }

  async findById(id: number): Promise<AtomVolumeEntity> {
    const volume = await this.atomVolumeRepository.findById(id);
    if (!volume) {
      throw new NotFoundError();
    }

    authorize('manage', 'Atom', volume.ownerId);
    return volume;
  }

  async findByOwnerId(ownerId?: string): Promise<AtomVolumeEntity[]> {
    const readable = await this.readableOwnerIds();

    if (ownerId != null && !readable.includes(ownerId)) {
      throw new UnauthorizedError();
    }

    return this.atomVolumeRepository.findByOwnerIds(
      ownerId != null ? [ownerId] : readable,
    );
  }

  async findByAtomId(atomId: string): Promise<AtomVolumeEntity[]> {
    await this.atomService.findById(atomId);
    return this.atomVolumeRepository.findByAtomId(atomId);
  }

  async create(data: CreateAtomVolumeDto): Promise<AtomVolumeEntity> {
    const user = this.currentUser();

    if (data.ownerId != null && data.ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    if (isForbiddenAtomMountPoint(data.mountPoint)) {
      throw new AtomVolumeForbiddenMountPointError(data.mountPoint);
    }

    await this.hostCapacityService.assertFitsOnCreate({
      cpuCores: 0,
      ramMB: 0,
      diskGB: data.sizeGiB,
    });

    const entity = new AtomVolumeEntity(
      data.name,
      getEventStateTransition(EventTypeKey.ATOM_VOLUME_CREATE).entry,
      data.sizeGiB,
      data.mountPoint,
      data.ownerId ?? user.companyId,
      user.userId,
    );

    return this.save(entity);
  }

  async update(
    id: number,
    data: UpdateAtomVolumeDto,
  ): Promise<AtomVolumeEntity> {
    const user = this.currentUser();
    const volume = await this.findById(id);

    return this.save(volume.clone({ name: data.name, updatedBy: user.userId }));
  }

  async attach(id: number, atomId: string): Promise<AtomEntity> {
    const user = this.currentUser();
    const volume = await this.findById(id);
    const atom = await this.atomService.findById(atomId);

    if (volume.status !== ResourceStatus.INACTIVE) {
      throw new AtomVolumeInvalidStatusError(
        ResourceStatus.INACTIVE,
        volume.status,
      );
    }

    if (volume.atomId != null) {
      throw new AtomVolumeAlreadyAttachedError(volume.atomId);
    }

    this.assertAtomIsStopped(atom);
    await this.assertMountPointIsFree(atomId, volume.mountPoint);

    await this.save(volume.clone({ atomId, updatedBy: user.userId }));

    return atom;
  }

  async detach(id: number): Promise<void> {
    const user = this.currentUser();
    const volume = await this.findById(id);

    if (volume.atomId == null) {
      throw new AtomVolumeNotAttachedError();
    }

    this.assertAtomIsStopped(await this.atomService.findById(volume.atomId));

    await this.save(volume.clone({ atomId: null, updatedBy: user.userId }));
  }

  async delete(id: number): Promise<void> {
    const user = this.currentUser();
    const volume = await this.findById(id);

    if (!DELETABLE_STATUSES.includes(volume.status)) {
      throw new AtomVolumeInvalidStatusError(DELETABLE_STATUSES, volume.status);
    }

    if (volume.atomId != null) {
      throw new AtomVolumeStillAttachedError(volume.atomId);
    }

    await this.save(
      volume.clone({
        status: getEventStateTransition(EventTypeKey.ATOM_VOLUME_DELETE).entry,
        updatedBy: user.userId,
      }),
    );
  }

  private assertAtomIsStopped(atom: AtomEntity): void {
    if (atom.status !== ResourceStatus.INACTIVE) {
      throw new AtomInvalidStatusError(ResourceStatus.INACTIVE, atom.status);
    }
  }

  private async assertMountPointIsFree(
    atomId: string,
    mountPoint: string,
  ): Promise<void> {
    const attached = await this.atomVolumeRepository.findByAtomId(atomId);

    if (attached.some((volume) => volume.mountPoint === mountPoint)) {
      throw new AtomVolumeMountPointTakenError(mountPoint, atomId);
    }
  }

  private currentUser() {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    return user;
  }

  private async readableOwnerIds(): Promise<string[]> {
    const user = this.currentUser();
    return this.companyHierarchyService.selfAndDescendants(user.companyId);
  }

  private save(data: AtomVolumeEntity): Promise<AtomVolumeEntity> {
    if (data.id == null) {
      return this.atomVolumeRepository.create(data);
    }

    return this.atomVolumeRepository.update(data);
  }
}

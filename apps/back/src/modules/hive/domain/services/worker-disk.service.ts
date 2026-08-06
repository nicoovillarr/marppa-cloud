import { Inject, Injectable } from '@nestjs/common';
import {
  EventTypeKey,
  getEventStateTransition,
  isReservedMountPoint,
  WORKER_VOLUME_DEVICE_TARGETS,
} from '@marppa-cloud/api-types';
import {
  WorkerDiskRepository,
  WORKER_DISK_REPOSITORY_SYMBOL,
} from '../repositories/worker-disk.repository';
import { WorkerDiskEntity } from '../entities/worker-disk.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerDiskDto } from '@/hive/presentation/dtos/create-worker-disk.dto';
import { UpdateWorkerDiskDto } from '@/hive/presentation/dtos/update-worker-disk.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { authorize } from '@/shared/domain/policy/authorize';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { WorkerStorageTypeService } from './worker-storage-type.service';
import { WorkerService } from './worker.service';
import { WorkerEntity } from '../entities/worker.entity';
import { WorkerInvalidStatusError } from '../errors/worker-invalid-status.error';
import { WorkerDiskInvalidStatusError } from '../errors/worker-disk-invalid-status.error';
import {
  WorkerDiskAlreadyAttachedError,
  WorkerDiskStillAttachedError,
} from '../errors/worker-disk-attachment.error';
import { WorkerDiskNotAttachableError } from '../errors/worker-disk-not-attachable.error';
import { WorkerDiskReservedMountPointError } from '../errors/worker-disk-reserved-mount-point.error';
import { WorkerDiskNoFreeSlotError } from '../errors/worker-disk-no-free-slot.error';

const DELETABLE_STATUSES = [ResourceStatus.INACTIVE, ResourceStatus.FAILED];

@Injectable()
export class WorkerDiskService {
  constructor(
    @Inject(WORKER_DISK_REPOSITORY_SYMBOL)
    private readonly workerDiskRepository: WorkerDiskRepository,

    private readonly workerService: WorkerService,
    private readonly workerStorageTypeService: WorkerStorageTypeService,
    private readonly companyHierarchyService: CompanyHierarchyService,
    private readonly hostCapacityService: HostCapacityService,
  ) { }

  async findById(id: number): Promise<WorkerDiskEntity> {
    const workerDisk = await this.workerDiskRepository.findById(id);
    if (!workerDisk) {
      throw new NotFoundError();
    }

    authorize('manage', 'Worker', workerDisk.ownerId);
    return workerDisk;
  }

  async findByOwnerId(ownerId?: string): Promise<WorkerDiskEntity[]> {
    const readable = await this.readableOwnerIds();

    if (ownerId != null && !readable.includes(ownerId)) {
      throw new UnauthorizedError();
    }

    return this.workerDiskRepository.findByOwnerIds(
      ownerId != null ? [ownerId] : readable,
    );
  }

  async findByWorkerId(workerId: string): Promise<WorkerDiskEntity[]> {
    await this.workerService.findById(workerId);
    return this.workerDiskRepository.findByWorkerId(workerId);
  }

  async create(data: CreateWorkerDiskDto): Promise<WorkerDiskEntity> {
    const user = this.currentUser();

    if (data.ownerId != null && data.ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    if (isReservedMountPoint(data.mountPoint)) {
      throw new WorkerDiskReservedMountPointError(data.mountPoint);
    }

    const storageType = await this.workerStorageTypeService.findById(
      data.storageTypeId,
    );

    if (!storageType.attachable) {
      throw new WorkerDiskNotAttachableError(storageType.name);
    }

    await this.hostCapacityService.assertFitsOnCreate({
      cpuCores: 0,
      ramMB: 0,
      diskGB: data.sizeGiB,
    });

    const entity = new WorkerDiskEntity(
      data.name,
      getEventStateTransition(EventTypeKey.WORKER_DISK_CREATE).entry,
      data.sizeGiB,
      data.ownerId ?? user.companyId,
      data.storageTypeId,
      user.userId,
      { mountPoint: data.mountPoint },
    );

    return this.save(entity);
  }

  async update(
    id: number,
    data: UpdateWorkerDiskDto,
  ): Promise<WorkerDiskEntity> {
    const user = this.currentUser();
    const workerDisk = await this.findById(id);

    return this.save(
      workerDisk.clone({ name: data.name, updatedBy: user.userId }),
    );
  }

  async attach(id: number, workerId: string): Promise<WorkerEntity> {
    const user = this.currentUser();
    const workerDisk = await this.findById(id);
    const worker = await this.workerService.findById(workerId);

    if (workerDisk.status !== ResourceStatus.INACTIVE) {
      throw new WorkerDiskInvalidStatusError(
        ResourceStatus.INACTIVE,
        workerDisk.status,
      );
    }

    if (workerDisk.workerId != null) {
      throw new WorkerDiskAlreadyAttachedError(workerDisk.workerId);
    }

    if (worker.status !== ResourceStatus.INACTIVE) {
      throw new WorkerInvalidStatusError(ResourceStatus.INACTIVE, worker.status);
    }

    await this.save(
      workerDisk.clone({
        status: getEventStateTransition(EventTypeKey.WORKER_DISK_ATTACH).entry,
        workerId,
        deviceTarget: await this.nextDeviceTarget(workerId),
        updatedBy: user.userId,
      }),
    );

    return worker;
  }

  private async nextDeviceTarget(workerId: string): Promise<string> {
    const attached = await this.workerDiskRepository.findByWorkerId(workerId);
    const taken = new Set(attached.map((disk) => disk.deviceTarget));

    const free = WORKER_VOLUME_DEVICE_TARGETS.find(
      (target) => !taken.has(target),
    );
    if (!free) {
      throw new WorkerDiskNoFreeSlotError(workerId);
    }

    return free;
  }

  async detach(id: number): Promise<void> {
    const user = this.currentUser();
    const workerDisk = await this.findById(id);

    if (workerDisk.status !== ResourceStatus.ACTIVE) {
      throw new WorkerDiskInvalidStatusError(
        ResourceStatus.ACTIVE,
        workerDisk.status,
      );
    }

    if (workerDisk.workerId != null) {
      const worker = await this.workerService.findById(workerDisk.workerId);
      if (worker.status !== ResourceStatus.INACTIVE) {
        throw new WorkerInvalidStatusError(
          ResourceStatus.INACTIVE,
          worker.status,
        );
      }
    }

    await this.save(
      workerDisk.clone({
        status: getEventStateTransition(EventTypeKey.WORKER_DISK_DETACH).entry,
        updatedBy: user.userId,
      }),
    );
  }

  async delete(id: number): Promise<void> {
    const user = this.currentUser();
    const workerDisk = await this.findById(id);

    if (!DELETABLE_STATUSES.includes(workerDisk.status)) {
      throw new WorkerDiskInvalidStatusError(
        DELETABLE_STATUSES,
        workerDisk.status,
      );
    }

    if (workerDisk.workerId != null) {
      throw new WorkerDiskStillAttachedError(workerDisk.workerId);
    }

    await this.save(
      workerDisk.clone({
        status: getEventStateTransition(EventTypeKey.WORKER_DISK_DELETE).entry,
        updatedBy: user.userId,
      }),
    );
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

  private save(data: WorkerDiskEntity): Promise<WorkerDiskEntity> {
    if (data.id == null) {
      return this.workerDiskRepository.create(data);
    }

    return this.workerDiskRepository.update(data);
  }
}

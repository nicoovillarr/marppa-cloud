import {
  WORKER_REPOSITORY_SYMBOL,
  WorkerRepository,
} from '../repositories/worker.repository';
import { WorkerEntity } from '../entities/worker.entity';
import { WorkerWithRelationsModel } from '../models/worker-with-relations.model';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UpdateWorkerDto } from '@/hive/presentation/dtos/update-worker.dto';
import { CreateWorkerDto } from '@/hive/presentation/dtos/create-worker.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { Inject, Injectable } from '@nestjs/common';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { MacAddressService } from './mac-address.service';
import { WorkerInvalidStatusError } from '../errors/worker-invalid-status.error';
import { authorize } from '@/shared/domain/policy/authorize';
import { WorkerFlavorService } from './worker-flavor.service';
import { WorkerImageService } from './worker-image.service';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { HostCapacityService } from '@/shared/domain/services/host-capacity.service';
import { WorkerFlavorDeprecatedError } from '../errors/worker-flavor-deprecated.error';
import { WorkerArchitectureMismatchError } from '../errors/worker-architecture-mismatch.error';
import { getWorkerBootDiskGB } from '../config/worker-boot-disk.config';

@Injectable()
export class WorkerService {
  constructor(
    @Inject(WORKER_REPOSITORY_SYMBOL)
    private readonly workerRepository: WorkerRepository,

    private readonly macAddressService: MacAddressService,
    private readonly workerFlavorService: WorkerFlavorService,
    private readonly workerImageService: WorkerImageService,
    private readonly companyHierarchyService: CompanyHierarchyService,
    private readonly hostCapacityService: HostCapacityService,
  ) { }

  async findById(id: string): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findById(id);
    if (!worker) {
      throw new NotFoundError();
    }

    authorize('manage', 'Worker', worker.ownerId);
    return worker;
  }

  async findByIdWithRelations(id: string): Promise<WorkerWithRelationsModel> {
    const worker = await this.workerRepository.findByIdWithRelations(id);
    if (!worker) {
      throw new NotFoundError();
    }

    authorize('manage', 'Worker', worker.worker.ownerId);
    return worker;
  }

  async findByOwnerId(ownerId?: string): Promise<WorkerWithRelationsModel[]> {
    const readable = await this.readableOwnerIds();

    if (ownerId != null && !readable.includes(ownerId)) {
      throw new UnauthorizedError();
    }

    return this.workerRepository.findByOwnerIds(
      ownerId != null ? [ownerId] : readable,
    );
  }

  async findByIdWithRelationsForRead(
    id: string,
  ): Promise<WorkerWithRelationsModel> {
    const worker = await this.workerRepository.findByIdWithRelations(id);
    if (!worker) {
      throw new NotFoundError();
    }

    if (!(await this.readableOwnerIds()).includes(worker.worker.ownerId)) {
      throw new NotFoundError();
    }

    return worker;
  }

  private async readableOwnerIds(): Promise<string[]> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    return this.companyHierarchyService.selfAndDescendants(user.companyId);
  }

  async createWorker(data: CreateWorkerDto): Promise<WorkerEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    if (data.ownerId != null && data.ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    const { flavor, family } = await this.workerFlavorService.findByIdWithFamily(
      data.flavorId,
    );

    const visibleOwnerIds =
      await this.companyHierarchyService.selfAndAncestors(user.companyId);

    if (!family.isVisibleTo(visibleOwnerIds) || family.isDeprecated) {
      throw new NotFoundError();
    }

    if (flavor.isDeprecated) {
      throw new WorkerFlavorDeprecatedError(flavor.name);
    }

    const image = await this.workerImageService.findById(data.imageId);

    if (image.architecture !== family.architecture) {
      throw new WorkerArchitectureMismatchError(
        image.architecture,
        family.architecture,
      );
    }

    const specs = {
      cpuCores: flavor.cpuCores,
      ramMB: flavor.ramMB,
      diskGB: getWorkerBootDiskGB(),
    };

    await this.hostCapacityService.assertFitsOnCreate(specs);

    const macAddress = this.macAddressService.generate();

    const entity = new WorkerEntity(
      data.name,
      getEventStateTransition(EventTypeKey.WORKER_CREATE).entry,
      macAddress,
      user.userId,
      data.imageId,
      data.flavorId,
      data.ownerId ?? user.companyId,
      specs.cpuCores,
      specs.ramMB,
      specs.diskGB,
    );

    return this.save(entity);
  }

  async startWorker(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);

    if (entity.status !== ResourceStatus.INACTIVE) {
      throw new WorkerInvalidStatusError(
        ResourceStatus.INACTIVE,
        entity.status,
      );
    }

    await this.hostCapacityService.assertFitsOnStart(entity.id!, entity);

    const updated = entity.clone({
      status: getEventStateTransition(EventTypeKey.WORKER_START).entry,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  async stopWorker(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);

    if (entity.status !== ResourceStatus.ACTIVE) {
      throw new WorkerInvalidStatusError(ResourceStatus.ACTIVE, entity.status);
    }

    const updated = entity.clone({
      status: getEventStateTransition(EventTypeKey.WORKER_TERMINATE).entry,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  async updateWorker(id: string, data: UpdateWorkerDto): Promise<WorkerEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    const updated = entity.clone({
      name: data.name,
      updatedBy: user.userId,
    });

    return this.save(updated);
  }

  async deleteWorker(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);

    if (entity.status !== ResourceStatus.INACTIVE) {
      throw new WorkerInvalidStatusError(
        ResourceStatus.INACTIVE,
        entity.status,
      );
    }

    const updated = entity.clone({
      // Entry status comes from the shared state machine (QUEUED): the
      // WORKER_DELETE processor validates exactly that, and DELETING is the
      // status it applies itself while working.
      status: getEventStateTransition(EventTypeKey.WORKER_DELETE).entry,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  private save(data: WorkerEntity): Promise<WorkerEntity> {
    if (data.id == null) {
      return this.workerRepository.create(data);
    }

    return this.workerRepository.update(data);
  }
}

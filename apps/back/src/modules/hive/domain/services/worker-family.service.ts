import { Inject, Injectable } from '@nestjs/common';
import { WorkerFamilyRepository } from '../repositories/worker-family.repository';
import { WorkerFamilyEntity } from '../entities/worker-family.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerFamilyDto } from '@/hive/presentation/dtos/create-worker-family.dto';
import { UpdateWorkerFamilyDto } from '@/hive/presentation/dtos/update-worker-family.dto';
import { WORKER_FAMILY_REPOSITORY_SYMBOL } from '../repositories/worker-family.repository';
import { WorkerFamilyWithFlavorsModel } from '../models/worker-family-with-flavors.model';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';

@Injectable()
export class WorkerFamilyService {
  constructor(
    @Inject(WORKER_FAMILY_REPOSITORY_SYMBOL)
    private readonly workerFamilyRepository: WorkerFamilyRepository,
    private readonly platformAdminService: PlatformAdminService,
    private readonly companyHierarchyService: CompanyHierarchyService,
  ) { }

  async findAll(
    includeDeprecated = false,
  ): Promise<WorkerFamilyWithFlavorsModel[]> {
    if (await this.platformAdminService.isPlatformAdmin()) {
      return this.workerFamilyRepository.findAll(includeDeprecated);
    }

    return this.workerFamilyRepository.findAvailableFor(
      await this.visibleOwnerIds(),
      includeDeprecated,
    );
  }

  async findById(id: number): Promise<WorkerFamilyEntity> {
    const workerFamily = await this.workerFamilyRepository.findById(id);
    if (!workerFamily) {
      throw new NotFoundError();
    }

    if (
      !workerFamily.isPublic &&
      !(await this.platformAdminService.isPlatformAdmin()) &&
      !workerFamily.isVisibleTo(await this.visibleOwnerIds())
    ) {
      throw new NotFoundError();
    }

    return workerFamily;
  }

  private visibleOwnerIds(): Promise<string[]> {
    return this.companyHierarchyService.selfAndAncestors(
      this.currentCompanyId(),
    );
  }

  async create(data: CreateWorkerFamilyDto): Promise<WorkerFamilyEntity> {
    const companyId = this.currentCompanyId();

    if (data.ownerId != null && data.ownerId !== companyId) {
      throw new UnauthorizedError();
    }

    const entity = new WorkerFamilyEntity(data.name, data.architecture, {
      description: data.description,
      ownerId: data.ownerId,
    });

    return this.save(entity);
  }

  async update(
    id: number,
    data: UpdateWorkerFamilyDto,
  ): Promise<WorkerFamilyEntity> {
    const entity = await this.findById(id);
    const updated = entity.clone({
      description: data.description,
    });

    return this.save(updated);
  }

  async deprecate(id: number): Promise<void> {
    const entity = await this.findById(id);
    if (entity.isDeprecated) {
      return;
    }

    await this.workerFamilyRepository.deprecate(entity.id!, new Date());
  }

  async restore(id: number): Promise<void> {
    const entity = await this.findById(id);
    if (!entity.isDeprecated) {
      return;
    }

    await this.workerFamilyRepository.restore(entity.id!);
  }

  private currentCompanyId(): string {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    return user.companyId;
  }

  private save(entity: WorkerFamilyEntity): Promise<WorkerFamilyEntity> {
    if (entity.id == null) {
      return this.workerFamilyRepository.create(entity);
    }

    return this.workerFamilyRepository.update(entity);
  }
}

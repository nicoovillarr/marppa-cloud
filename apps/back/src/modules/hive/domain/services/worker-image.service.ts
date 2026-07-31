import { Inject, Injectable } from '@nestjs/common';
import {
  WorkerImageRepository,
  WORKER_IMAGE_REPOSITORY_SYMBOL,
} from '../repositories/worker-image.repository';
import { WorkerImageEntity } from '../entities/worker-image.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { CreateWorkerImageDto } from '@/hive/presentation/dtos/create-worker-image.dto';
import { UpdateWorkerImageDto } from '@/hive/presentation/dtos/update-worker-image.dto';
import { WorkerImageInUseError } from '../errors/worker-image-in-use.error';
import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

@Injectable()
export class WorkerImageService {
  constructor(
    @Inject(WORKER_IMAGE_REPOSITORY_SYMBOL)
    private readonly workerImageRepository: WorkerImageRepository,
    private readonly platformAdminService: PlatformAdminService,
    private readonly companyHierarchyService: CompanyHierarchyService,
  ) { }

  async findById(id: number): Promise<WorkerImageEntity> {
    const workerImage = await this.workerImageRepository.findById(id);
    if (!workerImage) {
      throw new NotFoundError();
    }

    if (!(await this.canSee(workerImage))) {
      throw new NotFoundError();
    }

    return workerImage;
  }

  async findAll(): Promise<WorkerImageEntity[]> {
    if (await this.platformAdminService.isPlatformAdmin()) {
      return this.workerImageRepository.findAll();
    }

    return this.workerImageRepository.findAvailableFor(
      await this.visibleOwnerIds(),
    );
  }

  async create(data: CreateWorkerImageDto): Promise<WorkerImageEntity> {
    await this.assertOwnerWritable(data.ownerId);

    const workerImage = new WorkerImageEntity(
      data.name,
      data.osType,
      data.osFamily,
      data.imageUrl,
      data.architecture,
      data.virtualizationType,
      {
        description: data.description,
        osVersion: data.osVersion,
        workerStorageTypeId: data.workerStorageTypeId,
        ownerId: data.ownerId,
      },
    );

    return this.save(workerImage);
  }

  async update(
    id: number,
    data: UpdateWorkerImageDto,
  ): Promise<WorkerImageEntity> {
    await this.assertOwnerWritable(data.ownerId);

    const workerImage = await this.findById(id);

    workerImage.clone({
      name: data.name,
      osType: data.osType,
      osFamily: data.osFamily,
      imageUrl: data.imageUrl,
      architecture: data.architecture,
      virtualizationType: data.virtualizationType,
      description: data.description,
      osVersion: data.osVersion,
      workerStorageTypeId: data.workerStorageTypeId,
      ownerId: data.ownerId,
    });

    return this.save(workerImage);
  }

  async delete(id: number): Promise<void> {
    const workerImage = await this.findById(id);

    const workerCount = await this.workerImageRepository.countWorkers(id);
    if (workerCount > 0) {
      throw new WorkerImageInUseError(workerImage.name, workerCount);
    }

    await this.workerImageRepository.delete(id);
  }

  private async canSee(image: {
    isPublic: boolean;
    ownerId?: string;
  }): Promise<boolean> {
    if (image.isPublic) return true;
    if (await this.platformAdminService.isPlatformAdmin()) return true;

    return (await this.visibleOwnerIds()).includes(image.ownerId!);
  }

  private visibleOwnerIds(): Promise<string[]> {
    return this.companyHierarchyService.selfAndAncestors(
      this.currentCompanyId(),
    );
  }

  private async assertOwnerWritable(ownerId?: string): Promise<void> {
    if (ownerId == null) return;
    if (await this.platformAdminService.isPlatformAdmin()) return;

    this.assertOwnerAllowed(ownerId);
  }

  private currentCompanyId(): string {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    return user.companyId;
  }

  private assertOwnerAllowed(ownerId: string | undefined): void {
    if (ownerId == null) return;

    if (ownerId !== this.currentCompanyId()) {
      throw new ForbiddenError(
        'An image can only be scoped to your own company.',
      );
    }
  }

  private save(data: WorkerImageEntity): Promise<WorkerImageEntity> {
    if (data.id == null) {
      return this.workerImageRepository.create(data);
    }

    return this.workerImageRepository.update(data);
  }
}

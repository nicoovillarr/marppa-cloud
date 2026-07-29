import { Inject, Injectable } from '@nestjs/common';
import {
  ATOM_REPOSITORY_SYMBOL,
  AtomRepository,
} from '../repositories/atom.repository';
import { AtomEntity } from '../entities/atom.entity';
import { AtomWithRelationsModel } from '../models/atom-with-relations.model';
import { AtomInvalidStatusError } from '../errors/atom-invalid-status.error';
import { AtomImageService } from './atom-image.service';
import { CreateAtomDto } from '@/nucleus/presentation/dtos/create-atom.dto';
import { UpdateAtomDto } from '@/nucleus/presentation/dtos/update-atom.dto';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';
import { CompanyService } from '@/company/domain/services/company.service';
import { AtomImageEntity } from '../entities/atom-image.entity';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { forbiddenCapabilities, rootOnlyCapabilities } from '@marppa-cloud/shared';
import { assertCompanyOwnership } from '@/shared/domain/services/ownership.service';

@Injectable()
export class AtomService {
  constructor(
    @Inject(ATOM_REPOSITORY_SYMBOL)
    private readonly atomRepository: AtomRepository,

    private readonly atomImageService: AtomImageService,

    private readonly companyService: CompanyService,
  ) { }

  async findById(id: string): Promise<AtomEntity> {
    const atom = await this.atomRepository.findById(id);
    if (!atom) {
      throw new NotFoundError();
    }

    assertCompanyOwnership(atom.ownerId);
    return atom;
  }

  async findByIdWithRelations(id: string): Promise<AtomWithRelationsModel> {
    const atom = await this.atomRepository.findByIdWithRelations(id);
    if (!atom) {
      throw new NotFoundError();
    }

    assertCompanyOwnership(atom.atom.ownerId);
    return atom;
  }

  async findByOwnerId(ownerId?: string): Promise<AtomWithRelationsModel[]> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    if (ownerId != null && ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    return this.atomRepository.findByOwnerId(user.companyId);
  }

  /**
   * The image is resolved through the catalog before anything is written: an id
   * outside it is a 404 here rather than an unapproved container on the host.
   */
  async createAtom(data: CreateAtomDto): Promise<AtomEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    if (data.ownerId != null && data.ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    const image = await this.atomImageService.findById(data.imageId);
    await this.assertImageAllowed(image);
    this.assertRequiredEnvVars(image, data.envVars);

    const entity = new AtomEntity(
      data.name,
      getEventStateTransition(EventTypeKey.ATOM_CREATE).entry,
      user.userId,
      image.id!,
      data.ownerId ?? user.companyId,
    );

    return this.save(entity);
  }

  async startAtom(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    this.assertStatus(entity, ResourceStatus.INACTIVE);

    const updated = entity.clone({
      status: getEventStateTransition(EventTypeKey.ATOM_START).entry,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  async stopAtom(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    this.assertStatus(entity, ResourceStatus.ACTIVE);

    const updated = entity.clone({
      status: getEventStateTransition(EventTypeKey.ATOM_TERMINATE).entry,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  /**
   * The container is rebuilt from the row on every start, so a rename only takes
   * effect on the next one — editing a running atom would leave the DB and the
   * host disagreeing until then.
   */
  async updateAtom(id: string, data: UpdateAtomDto): Promise<AtomEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    this.assertStatus(entity, ResourceStatus.INACTIVE);

    const updated = entity.clone({
      name: data.name,
      updatedBy: user.userId,
    });

    return this.save(updated);
  }

  async deleteAtom(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    this.assertStatus(entity, ResourceStatus.INACTIVE);

    const updated = entity.clone({
      status: getEventStateTransition(EventTypeKey.ATOM_DELETE).entry,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  /**
   * Capabilities are graded by blast radius, not counted. A tenant-safe one
   * stops at the container's network namespace and the zone around it — a zone
   * only ever holds one company's resources, so the worst case is self-inflicted
   * — while anything unclassified is root-company only by default, the same bar
   * `SYSTEM_RESET` uses. Grading here rather than reading a flag off the row
   * means a capability nobody reviewed is restricted instead of overlooked.
   */
  private async assertImageAllowed(image: AtomImageEntity): Promise<void> {
    const forbidden = forbiddenCapabilities(image.capabilities);
    if (forbidden.length) {
      throw new ForbiddenError(
        `Image "${image.name}" requests capabilities that are never granted: ${forbidden.join(', ')}.`,
      );
    }

    const rootOnly = rootOnlyCapabilities(image.capabilities);
    if (rootOnly.length && !(await this.isRootCompany())) {
      throw new ForbiddenError(
        `Image "${image.name}" requests host capabilities (${rootOnly.join(', ')}) ` +
        'and can only be used by the root company.',
      );
    }
  }

  private assertRequiredEnvVars(
    image: AtomImageEntity,
    envVars?: { key: string; value: string }[],
  ): void {
    const provided = new Map((envVars ?? []).map((envVar) => [envVar.key, envVar.value]));

    const missing = image.requiredEnvVars.filter(
      (key) => !provided.get(key)?.trim(),
    );

    if (missing.length) {
      throw new BadRequestError(
        `Image "${image.name}" requires ${missing.join(', ')} to be set.`,
      );
    }
  }

  private async isRootCompany(): Promise<boolean> {
    const user = getCurrentUser();
    if (!user) return false;

    const company = await this.companyService.findById(user.companyId);

    return !!company && !company.parentCompanyId;
  }

  assertStatus(atom: AtomEntity, expected: ResourceStatus): void {
    if (atom.status !== expected) {
      throw new AtomInvalidStatusError(expected, atom.status);
    }
  }

  private save(data: AtomEntity): Promise<AtomEntity> {
    if (data.id == null) {
      return this.atomRepository.create(data);
    }

    return this.atomRepository.update(data);
  }
}

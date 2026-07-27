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
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';

@Injectable()
export class AtomService {
  constructor(
    @Inject(ATOM_REPOSITORY_SYMBOL)
    private readonly atomRepository: AtomRepository,

    private readonly atomImageService: AtomImageService,
  ) { }

  async findById(id: string): Promise<AtomEntity> {
    const atom = await this.atomRepository.findById(id);
    if (!atom) {
      throw new NotFoundError();
    }

    this.assertOwnership(atom.ownerId);
    return atom;
  }

  async findByIdWithRelations(id: string): Promise<AtomWithRelationsModel> {
    const atom = await this.atomRepository.findByIdWithRelations(id);
    if (!atom) {
      throw new NotFoundError();
    }

    this.assertOwnership(atom.atom.ownerId);
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

  assertStatus(atom: AtomEntity, expected: ResourceStatus): void {
    if (atom.status !== expected) {
      throw new AtomInvalidStatusError(expected, atom.status);
    }
  }

  private assertOwnership(ownerId: string): void {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    if (ownerId !== user.companyId) {
      throw new NotFoundError();
    }
  }

  private save(data: AtomEntity): Promise<AtomEntity> {
    if (data.id == null) {
      return this.atomRepository.create(data);
    }

    return this.atomRepository.update(data);
  }
}

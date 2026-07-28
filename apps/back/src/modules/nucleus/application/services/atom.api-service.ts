import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AtomService } from '@/nucleus/domain/services/atom.service';
import { AtomEnvVarApiService } from './atom-env-var.api-service';
import { CreateAtomDto } from '@/nucleus/presentation/dtos/create-atom.dto';
import { UpdateAtomDto } from '@/nucleus/presentation/dtos/update-atom.dto';
import { AtomResponseModel } from '../models/atom.response-model';
import { AtomImageResponseModel } from '../models/atom-image.response-model';
import { AtomWithRelationsResponseModel } from '../models/atom-with-relations.response-model';
import { AtomWithRelationsModel } from '@/nucleus/domain/models/atom-with-relations.model';
import { NodeResponseModel } from '@/mesh/application/models/node.response-model';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { mergeDto } from '@/shared/application/utils/merge-dto.utils';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

@Injectable()
export class AtomApiService {
  constructor(
    private readonly service: AtomService,
    private readonly envVarService: AtomEnvVarApiService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  public async findById(id: string): Promise<AtomWithRelationsResponseModel> {
    const data = await this.service.findByIdWithRelations(id);
    return this.toResponse(data);
  }

  public async findByOwnerId(
    ownerId?: string,
  ): Promise<AtomWithRelationsResponseModel[]> {
    if (!ownerId) {
      const user = getCurrentUser();
      if (!user) {
        throw new UnauthorizedError();
      }

      ownerId = user.companyId;
    }

    const list = await this.service.findByOwnerId(ownerId);
    return list.map((data) => this.toResponse(data));
  }

  public async create(data: CreateAtomDto): Promise<AtomResponseModel> {
    const entity = await this.service.createAtom(data);

    for (const envVar of data.envVars ?? []) {
      await this.envVarService.upsert(entity.id!, envVar);
    }

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ATOM_CREATE,
      primary: { type: 'Atom', id: entity.id! },
    });

    return plainToInstance(AtomResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * An atom only has an address once it has a Node in an ACTIVE zone: the
   * container is attached to that zone's bridge with the node's IP, so both
   * preconditions are a clear API error here instead of five failed retries.
   * The node travels as PARENT so a still-provisioning one defers the job.
   */
  public async start(id: string): Promise<void> {
    const { node, image } = await this.service.findByIdWithRelations(id);

    if (node == null) {
      throw new Error(
        'Atom has no node assigned: create a node for it in a zone before starting it',
      );
    }

    if (node.status !== ResourceStatus.ACTIVE) {
      throw new Error(
        `Atom node must be ACTIVE to start the atom (is ${node.status})`,
      );
    }

    const envVars = await this.envVarService.findByAtomId(id);
    const missing = image.requiredEnvVars.filter(
      (key) => !envVars.find((envVar) => envVar.key === key)?.value.trim(),
    );

    if (missing.length) {
      throw new Error(
        `Atom is missing required env vars for image "${image.name}": ${missing.join(', ')}`,
      );
    }

    await this.service.startAtom(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ATOM_START,
      primary: { type: 'Atom', id },
      parent: { type: 'Node', id: node.id! },
    });
  }

  public async terminate(id: string): Promise<void> {
    await this.service.stopAtom(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ATOM_TERMINATE,
      primary: { type: 'Atom', id },
    });
  }

  public async update(
    id: string,
    data: UpdateAtomDto,
  ): Promise<AtomResponseModel> {
    const entity = await this.service.updateAtom(id, data);

    return plainToInstance(AtomResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.service.deleteAtom(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ATOM_DELETE,
      primary: { type: 'Atom', id },
    });
  }

  private toResponse(
    data: AtomWithRelationsModel,
  ): AtomWithRelationsResponseModel {
    const atom = plainToInstance(AtomResponseModel, data.atom, { excludeExtraneousValues: true });
    const image = plainToInstance(AtomImageResponseModel, data.image, { excludeExtraneousValues: true });
    const node = data.node ? plainToInstance(NodeResponseModel, data.node, { excludeExtraneousValues: true }) : null;

    return mergeDto(
      AtomWithRelationsResponseModel,
      atom,
      {
        image,
        node,
      },
    );
  }
}

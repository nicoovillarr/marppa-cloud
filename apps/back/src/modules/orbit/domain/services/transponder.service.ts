import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSPONDER_REPOSITORY,
  TransponderRepository,
} from '../repositories/transponder.repository';
import { TransponderEntity } from '../entities/transponder.entity';
import { CreateTransponderDto } from '../../presentation/dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../../presentation/dtos/update-transponder.dto';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { PortalService } from './portal.service';
import { NodeService } from '@/mesh/domain/services/node.service';

@Injectable()
export class TransponderService {
  constructor(
    @Inject(TRANSPONDER_REPOSITORY)
    private readonly repository: TransponderRepository,
    private readonly portalService: PortalService,
    private readonly nodeService: NodeService,
  ) { }

  public async findById(
    portalId: string,
    transponderId: string,
  ): Promise<TransponderEntity | null> {
    await this.portalService.findById(portalId);
    return this.repository.findById(portalId, transponderId);
  }

  public async findByPortalId(portalId: string): Promise<TransponderEntity[]> {
    await this.portalService.findById(portalId);
    return this.repository.findByPortalId(portalId);
  }

  public async create(
    portalId: string,
    dto: CreateTransponderDto,
  ): Promise<TransponderEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    await this.portalService.findById(portalId);
    await this.assertUsableNode(dto.nodeId);

    const entity = new TransponderEntity(
      dto.path,
      dto.port,
      getEventStateTransition(EventTypeKey.TRANSPONDER_CREATE).entry,
      user.userId,
      portalId,
      {
        mode: dto.mode,
        cacheEnabled: dto.cacheEnabled,
        allowCookies: dto.allowCookies,
        gzipEnabled: dto.gzipEnabled,
        priority: dto.priority,
        nodeId: dto.nodeId,
      },
    );

    return this.repository.create(entity);
  }

  public async update(
    portalId: string,
    transponderId: string,
    dto: UpdateTransponderDto,
  ): Promise<TransponderEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const transponder = await this.findById(portalId, transponderId);
    if (!transponder) {
      throw new NotFoundError();
    }

    await this.assertUsableNode(dto.nodeId);

    const updated = transponder.clone({
      path: dto.path,
      port: dto.port,
      mode: dto.mode,
      cacheEnabled: dto.cacheEnabled,
      allowCookies: dto.allowCookies,
      gzipEnabled: dto.gzipEnabled,
      priority: dto.priority,
      nodeId: dto.nodeId,
      status: getEventStateTransition(EventTypeKey.TRANSPONDER_UPDATE).entry,
      updatedBy: user.userId,
    });

    return this.repository.update(updated);
  }

  public async delete(portalId: string, transponderId: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const transponder = await this.findById(portalId, transponderId);
    if (!transponder) {
      throw new NotFoundError();
    }

    const deletable: ResourceStatus[] = [
      ResourceStatus.ACTIVE,
      ResourceStatus.FAILED,
    ];
    if (!deletable.includes(transponder.status)) {
      throw new Error(
        `Transponder must be ${deletable.join(' or ')} to be deleted (is ${transponder.status})`,
      );
    }

    const queued = transponder.clone({
      status: getEventStateTransition(EventTypeKey.TRANSPONDER_DELETE).entry,
      updatedBy: user.userId,
    });

    await this.repository.update(queued);
  }

  private async assertUsableNode(nodeId?: string): Promise<void> {
    if (nodeId == null) {
      return;
    }

    const node = await this.nodeService.findByIdForCaller(nodeId);
    if (node.status !== ResourceStatus.ACTIVE) {
      throw new Error(
        `Node must be ACTIVE to receive traffic from a transponder (is ${node.status})`,
      );
    }
  }
}

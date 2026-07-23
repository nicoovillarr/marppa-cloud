import { Inject, Injectable } from '@nestjs/common';
import {
  NODE_REPOSITORY_SYMBOL,
  NodeRepository,
} from '../repositories/node.repository';
import { NodeEntity } from '../entities/node.entity';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { CreateNodeDto } from '../../presentation/dtos/create-node.dto';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

@Injectable()
export class NodeService {
  constructor(
    @Inject(NODE_REPOSITORY_SYMBOL)
    private readonly repository: NodeRepository,
  ) { }

  public async findById(zoneId: string, id: string): Promise<NodeEntity> {
    const entity = await this.repository.findById(zoneId, id);
    if (entity == null) {
      throw new NotFoundError();
    }

    return entity;
  }

  public findByZoneId(zoneId: string): Promise<NodeEntity[]> {
    return this.repository.findByZoneId(zoneId);
  }

  public findByWorkerId(workerId: string): Promise<NodeEntity | null> {
    return this.repository.findByWorkerId(workerId);
  }

  public findByWorkerIds(workerIds: string[]): Promise<NodeEntity[]> {
    return this.repository.findByWorkerIds(workerIds);
  }

  public create(
    zoneId: string,
    data: CreateNodeDto,
    ipAddress: string,
  ): Promise<NodeEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const { workerId, atomId } = data;
    if (workerId == null && atomId == null) {
      throw new Error('Worker ID or Atom ID must be provided');
    }

    if (workerId != null && atomId != null) {
      throw new Error('Worker ID and Atom ID cannot be provided together');
    }

    const node = new NodeEntity(
      ipAddress,
      getEventStateTransition(EventTypeKey.NODE_ASSIGN_WORKER).entry,
      zoneId,
      user.userId,
      {
        workerId: data.workerId,
        atomId: data.atomId,
      },
    );

    return this.repository.create(node);
  }

  /**
   * Queue NODE_STOP: the processor detaches the NIC from the bridge and drops
   * the DHCP reservation, leaving the node INACTIVE with its worker still
   * attached (that is what distinguishes stop from unassign). Only an active
   * node can be stopped.
   */
  public async stop(zoneId: string, id: string): Promise<NodeEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const node = await this.findById(zoneId, id);

    if (node.workerId == null) {
      throw new Error('Only worker-backed nodes can be started or stopped');
    }

    const stoppable = [ResourceStatus.ACTIVE, ResourceStatus.FAILED];
    if (!stoppable.includes(node.status)) {
      throw new Error(
        `Node must be ${stoppable.join(' or ')} to be stopped (is ${node.status})`,
      );
    }

    const updated = node.clone({
      status: getEventStateTransition(EventTypeKey.NODE_STOP).entry,
      updatedBy: user.userId,
    });

    return this.repository.update(updated);
  }

  /**
   * Queue NODE_START: the processor re-adds the DHCP reservation and re-attaches
   * the NIC to the (already active) zone bridge. Only a stopped/failed node can
   * be started.
   */
  public async start(zoneId: string, id: string): Promise<NodeEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const node = await this.findById(zoneId, id);

    if (node.workerId == null) {
      throw new Error('Only worker-backed nodes can be started or stopped');
    }

    const startable = [ResourceStatus.INACTIVE, ResourceStatus.FAILED];
    if (!startable.includes(node.status)) {
      throw new Error(
        `Node must be ${startable.join(' or ')} to be started (is ${node.status})`,
      );
    }

    const updated = node.clone({
      status: getEventStateTransition(EventTypeKey.NODE_START).entry,
      updatedBy: user.userId,
    });

    return this.repository.update(updated);
  }

  public delete(zoneId: string, id: string): Promise<void> {
    return this.repository.delete(zoneId, id);
  }
}

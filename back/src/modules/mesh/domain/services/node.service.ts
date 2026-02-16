import { Inject, Injectable } from '@nestjs/common';
import {
  NODE_REPOSITORY_SYMBOL,
  NodeRepository,
} from '../repositories/node.repository';
import { NodeEntity } from '../entities/node.entity';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { CreateNodeDto } from '../../presentation/dtos/create-node.dto';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';

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
      ResourceStatus.ACTIVE,
      zoneId,
      user.userId,
      {
        workerId: data.workerId,
        atomId: data.atomId,
      },
    );

    return this.repository.create(node);
  }

  public delete(zoneId: string, id: string): Promise<void> {
    return this.repository.delete(zoneId, id);
  }
}

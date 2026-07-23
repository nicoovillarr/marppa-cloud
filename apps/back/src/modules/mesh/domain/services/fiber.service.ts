import { Inject, Injectable } from '@nestjs/common';
import {
  FIBER_REPOSITORY_SYMBOL,
  FiberRepository,
} from '../repositories/fiber.repository';
import { CreateFiberDto } from '../../presentation/dtos/create-fiber.dto';
import { FiberEntity } from '../entities/fiber.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

@Injectable()
export class FiberService {
  constructor(
    @Inject(FIBER_REPOSITORY_SYMBOL)
    private readonly repository: FiberRepository,
  ) {}

  public async findById(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<FiberEntity> {
    const entity = await this.repository.findById(zoneId, nodeId, fiberId);
    if (entity == null) {
      throw new NotFoundError();
    }

    return entity;
  }

  public findByNodeId(zoneId: string, nodeId: string): Promise<FiberEntity[]> {
    return this.repository.findByNodeId(zoneId, nodeId);
  }

  public async create(
    nodeId: string,
    data: CreateFiberDto,
  ): Promise<FiberEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const fiber = new FiberEntity(
      data.protocol,
      data.targetPort,
      getEventStateTransition(EventTypeKey.NODE_CREATE_FIBER).entry,
      nodeId,
      user.userId,
      // TODO: Calculate random hostport
    );

    return this.repository.create(fiber);
  }

  /**
   * Queue the fiber for deletion: set the NODE_DELETE_FIBER entry status so the
   * cloud-scripts processor can remove the DNAT rules before marking it DELETED.
   * Hard-deleting the row here would orphan the nftables rules on the host.
   */
  public async delete(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const fiber = await this.findById(zoneId, nodeId, fiberId);

    const deletable: string[] = [ResourceStatus.ACTIVE, ResourceStatus.FAILED];
    if (!deletable.includes(fiber.status)) {
      throw new Error(
        `Fiber must be ${deletable.join(' or ')} to be deleted (is ${fiber.status})`,
      );
    }

    const updated = fiber.clone({
      status: getEventStateTransition(EventTypeKey.NODE_DELETE_FIBER).entry,
      updatedBy: user.userId,
    });

    await this.repository.update(updated);
  }
}

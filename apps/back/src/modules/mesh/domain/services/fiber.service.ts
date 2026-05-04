import { Inject, Injectable } from '@nestjs/common';
import {
  FIBER_REPOSITORY_SYMBOL,
  FiberRepository,
} from '../repositories/fiber.repository';
import { CreateFiberDto } from '../../presentation/dtos/create-fiber.dto';
import { FiberEntity } from '../entities/fiber.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';

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
      ResourceStatus.ACTIVE,
      nodeId,
      user.userId,
      // TODO: Calculate random hostport
    );

    return this.repository.create(fiber);
  }

  public delete(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<void> {
    return this.repository.delete(zoneId, nodeId, fiberId);
  }
}

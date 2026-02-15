import { FiberEntity } from '../entities/fiber.entity';

export const FIBER_REPOSITORY_SYMBOL = Symbol('FIBER_REPOSITORY');

export abstract class FiberRepository {
  abstract findById(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<FiberEntity | null>;
  abstract findByNodeId(zoneId: string, nodeId: string): Promise<FiberEntity[]>;
  abstract create(fiber: FiberEntity): Promise<FiberEntity>;
  abstract delete(
    zoneId: string,
    nodeId: string,
    fiberId: number,
  ): Promise<void>;
}

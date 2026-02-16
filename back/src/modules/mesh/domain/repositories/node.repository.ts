import { NodeEntity } from '../entities/node.entity';

export const NODE_REPOSITORY_SYMBOL = Symbol('NODE_REPOSITORY');

export abstract class NodeRepository {
  abstract findById(zoneId: string, id: string): Promise<NodeEntity | null>;
  abstract findByZoneId(zoneId: string): Promise<NodeEntity[]>;
  abstract findByWorkerId(workerId: string): Promise<NodeEntity | null>;
  abstract findByWorkerIds(workerIds: string[]): Promise<NodeEntity[]>;
  abstract create(node: NodeEntity): Promise<NodeEntity>;
  abstract delete(zoneId: string, id: string): Promise<void>;
}

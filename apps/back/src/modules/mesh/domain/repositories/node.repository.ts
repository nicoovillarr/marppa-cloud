import { NodeEntity } from '../entities/node.entity';
import { NodeWithZoneModel } from '../models/node-with-zone.model';

export const NODE_REPOSITORY_SYMBOL = Symbol('NODE_REPOSITORY');

export abstract class NodeRepository {
  abstract findById(zoneId: string, id: string): Promise<NodeEntity | null>;
  abstract findByIdWithZone(id: string): Promise<NodeWithZoneModel | null>;
  abstract findWorkerOwnerId(workerId: string): Promise<string | null>;
  abstract findByZoneId(zoneId: string): Promise<NodeEntity[]>;
  abstract findByWorkerId(workerId: string): Promise<NodeEntity | null>;
  abstract findByWorkerIds(workerIds: string[]): Promise<NodeEntity[]>;
  abstract create(node: NodeEntity): Promise<NodeEntity>;
  abstract update(node: NodeEntity): Promise<NodeEntity>;
  abstract delete(zoneId: string, id: string): Promise<void>;
}

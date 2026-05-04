import { ZoneEntity } from '../entities/zone.entity';
import { ZoneWithNodesModel } from '../models/zone-with-nodes.model';
import { ZoneWithNodesAndFibersModel } from '../models/zone-with-nodes-and-fibers.model';

export const ZONE_REPOSITORY_SYMBOL = Symbol('ZONE_REPOSITORY');

export abstract class ZoneRepository {
  abstract findById(id: string): Promise<ZoneEntity | null>;
  abstract findByIdWithNodes(id: string): Promise<ZoneWithNodesModel | null>;
  abstract findByIdFull(id: string): Promise<ZoneWithNodesAndFibersModel | null>;
  abstract findByOwnerId(ownerId: string): Promise<ZoneWithNodesAndFibersModel[]>;
  abstract findLastZone(): Promise<ZoneWithNodesModel | null>;
  abstract create(zone: ZoneEntity): Promise<ZoneEntity>;
  abstract update(zone: ZoneEntity): Promise<ZoneEntity>;
  abstract delete(id: string): Promise<void>;
}

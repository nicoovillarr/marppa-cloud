import { ZoneEntity } from "../entities/zone.entity";
import { ZoneWithNodesModel as ZoneWithNodesModel } from "../models/zone-with-nodes.model";

export const ZONE_REPOSITORY_SYMBOL = Symbol('ZONE_REPOSITORY')

export abstract class ZoneRepository {
  abstract findById(id: string): Promise<ZoneEntity | null>;
  abstract findWithNodesById(id: string): Promise<ZoneWithNodesModel | null>;
  abstract findByOwnerId(ownerId: string): Promise<ZoneEntity[]>;
  abstract findLastZone(): Promise<ZoneWithNodesModel | null>;
  abstract create(zone: ZoneEntity): Promise<ZoneEntity>;
  abstract update(zone: ZoneEntity): Promise<ZoneEntity>;
  abstract delete(id: string): Promise<void>;
}